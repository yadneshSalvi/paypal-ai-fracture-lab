"""Read a sealed study without executing, retrying, or reclassifying a candidate.

Only structural transport metadata is emitted. Provider bodies, prompts, tool
results, and opaque reasoning never enter the diagnostic report.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


def read_json(path: Path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == ".gz" else data)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def confined(base: Path, relative: str) -> Path:
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts or "\\" in relative:
        raise ValueError("Unsafe retained artifact path")
    result = (base / path).resolve(strict=True)
    if not result.is_relative_to(base):
        raise ValueError("Retained artifact escapes its root")
    return result


def bound_files(protocol):
    found = {}

    def visit(value):
        if isinstance(value, dict):
            if set(value) == {"path", "sha256"}:
                old = found.setdefault(value["path"], value["sha256"])
                if old != value["sha256"]:
                    raise ValueError("Conflicting protocol binding")
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(protocol)
    return found


def verify_manifest(base, files):
    checked = 0
    for item in files:
        if sha(confined(base, item["path"]).read_bytes()) != item["sha256"]:
            raise ValueError("An original bound artifact changed: " + item["path"])
        checked += 1
    return checked


def summarize(root: Path):
    study_id = "fracture-context-2026-11-v1"
    public = root / "evaluation/studies" / study_id
    private = root / ".artifacts/evaluation-studies" / study_id
    seal = read_json(public / "seal.json")
    protocol = read_json(public / "protocol.json")
    report = read_json(public / "report.json")
    grades = read_json(public / "grades.anonymous.json")
    if report["status"] != "sealed" or report["planned"] != 600:
        raise ValueError("The exact original sealed study is required")
    if (private / "execution-lock.json").exists():
        raise ValueError("An execution lock remains; refuse to inspect a running study")
    if read_json(private / "seal.json") != seal:
        raise ValueError("Private and published seals differ")

    bindings = bound_files(protocol)
    bound_count = verify_manifest(root, [{"path": p, "sha256": h} for p, h in bindings.items()])
    sealed_count = verify_manifest(private, seal["files"])
    by_candidate = defaultdict(list)
    for grade in grades:
        by_candidate[grade["candidateId"]].append(grade)
    if len(grades) != 606 or len(by_candidate) != 600 or bound_count != 1127:
        raise ValueError("Original denominator or input binding count changed")

    final_counts = Counter()
    groups = defaultdict(list)
    rows = []
    request_shapes = Counter()
    for row in report["rows"]:
        history = sorted(by_candidate[row["candidateId"]], key=lambda g: g["attemptNumber"])
        grade = history[-1]
        if row["attemptNumber"] != grade["attemptNumber"] or row["errorCode"] != grade["errorCode"]:
            raise ValueError("Published and anonymous outcomes disagree")
        final_counts[grade["stage"]] += 1
        if grade["stage"] != "infrastructure_failure":
            continue
        attempts = []
        for item in history:
            directory = private / "attempts" / row["candidateId"] / str(item["attemptNumber"])
            saved = directory / "generation.json.gz"
            reused = not saved.exists()
            if reused:
                reference = read_json(directory / "generation-reference.json")
                if reference["candidateId"] != row["candidateId"] or reference["attemptNumber"] != 1:
                    raise ValueError("Invalid original-source retry reference")
                saved = directory.parent / "1/generation.json.gz"
            generation = read_json(saved)
            if generation["receiptHash"] != item["providerReceiptHash"]:
                raise ValueError("Generation binding mismatch")
            calls_dir = directory / "calls"
            dispatches = sorted(calls_dir.glob("*-dispatch.json.gz")) if calls_dir.exists() else []
            responses = {x.name.split("-")[0] for x in calls_dir.glob("*-response.json.gz")} if calls_dir.exists() else set()
            unanswered = []
            for path in dispatches:
                dispatch = read_json(path)
                request = dispatch["request"]
                shape = (dispatch["provider"], str(request.get("store", "omitted")),
                         str(request.get("background", "omitted")), str(request.get("stream", "omitted")))
                request_shapes[shape] += 1
                if path.name.split("-")[0] not in responses:
                    unanswered.append({"index": int(path.name.split("-")[0]),
                                       "requestHash": dispatch["requestHash"],
                                       "dispatchedAt": dispatch["dispatchedAt"]})
            last = generation["calls"][-1] if generation["calls"] else None
            http = last["http"] if last else None
            safe_http = {k: http.get(k) for k in ["provider", "requestHash", "startedAt", "finishedAt", "durationMs", "httpStatus", "responseHash", "errorCode"]} if http else None
            runner = directory / "runner.json.gz"
            runner_data = read_json(runner) if runner.exists() else None
            attempts.append({
                "attemptNumber": item["attemptNumber"], "originalStage": item["stage"],
                "originalErrorCode": item["errorCode"], "sourceHash": item["sourceHash"],
                "generationReceiptHash": generation["receiptHash"], "sourceReused": reused,
                "dispatches": len(dispatches), "responses": len(responses), "unansweredDispatches": unanswered,
                "lastRecordedHttp": safe_http,
                "lastResponseIdRecorded": bool(last and last["responseId"]),
                "nativeTransportExceptionRecorded": bool(http and (http.get("exception") or http.get("cause"))),
                "runner": {k: runner_data[k] for k in ["kind", "errorCode", "diagnostic", "receiptHash"] if k in runner_data} if runner_data else None,
            })
        entry = {"candidateId": row["candidateId"], "model": row["model"],
                 "originalErrorCode": grade["errorCode"], "attempts": attempts}
        rows.append(entry)
        groups[(row["model"], grade["errorCode"])].append(entry)

    summaries = []
    for (model, code), entries in sorted(groups.items()):
        http = [v["attempts"][-1]["lastRecordedHttp"] for v in entries]
        durations = sorted(v["durationMs"] for v in http if v)
        summaries.append({"model": model, "originalErrorCode": code, "candidates": len(entries),
                          "lastRecordedHttpStatuses": dict(Counter(str(v["httpStatus"]) if v else "none" for v in http)),
                          "lastCallDurationsMs": {"minimum": durations[0], "median": durations[len(durations) // 2], "maximum": durations[-1], "between295And310Seconds": sum(295000 <= n <= 310000 for n in durations)} if durations else None})
    if len(rows) != 299 or sum(final_counts.values()) != 600:
        raise ValueError("Infrastructure census is incomplete")
    return {
        "schemaVersion": 1, "at": datetime.now(timezone.utc).isoformat(),
        "kind": "post_seal_observational_infrastructure_census", "studyId": study_id,
        "sourceSealSha256": sha((public / "seal.json").read_bytes()), "sealHash": report["sealHash"],
        "originalInputsVerified": bound_count, "originalSealedFilesVerified": sealed_count,
        "planned": 600, "retainedAttempts": 606, "finalStages": dict(final_counts),
        "infrastructureCandidates": len(rows), "groups": summaries,
        "observedRequestShapesForInfrastructureHistories": [
            {"provider": k[0], "store": k[1], "background": k[2], "stream": k[3], "dispatches": count}
            for k, count in sorted(request_shapes.items())],
        "limitations": [
            "Original outcome labels and all attempted histories are unchanged.",
            "A five-minute timing cluster is consistent with a transport timeout but does not prove the cause of historical calls whose native exception was not retained.",
            "HTTP 520 and invalid JSON are recorded observations; the original raw invalid response and content type were not retained, so no gateway root cause is assigned.",
            "Runner stderr is retained only as a digest. Repeated hashes identify the same diagnostic bytes, not their absent content.",
            "No original request, source, candidate, grading run or payment operation was replayed.",
        ],
        "candidateRows": rows, "providerCalls": 0, "modelCalls": 0,
        "originalFilesWritten": 0, "outcomesReclassified": 0,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result = summarize(args.original_root.resolve(strict=True))
    with args.output.open("x") as output:
        json.dump(result, output, indent=2)
        output.write("\n")
    print(json.dumps({k: result[k] for k in ["kind", "originalInputsVerified", "originalSealedFilesVerified", "planned", "retainedAttempts", "finalStages", "infrastructureCandidates", "groups", "observedRequestShapesForInfrastructureHistories", "originalFilesWritten"]}))
