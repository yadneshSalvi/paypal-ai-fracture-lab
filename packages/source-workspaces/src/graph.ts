import type { SourceEvidence, SourceFileManifest, SourceImportLimits, SourceIntegrationEdge, SourceIntegrationGraph, SourceIntegrationNode, SourceRiskFinding, SourceSpan, StaticConfidence, StaticEvidenceType } from "./types";
import { SOURCE_GRAPH_SCHEMA, SourceWorkspaceError } from "./types";
import { objectHash, sourceSpan } from "./util";

export interface InspectedSource { manifest: SourceFileManifest; content: string }
export interface StaticImportLink { from: string; module: string; source: SourceSpan }
export interface InspectionFragment {
  nodes: SourceIntegrationNode[];
  edges: SourceIntegrationEdge[];
  findings: SourceRiskFinding[];
  imports: StaticImportLink[];
}
export class GraphBuilder {
  readonly nodes: SourceIntegrationNode[] = [];
  readonly edges: SourceIntegrationEdge[] = [];
  readonly findings: SourceRiskFinding[] = [];
  readonly imports: StaticImportLink[] = [];
  private readonly keys = new Set<string>();
  private readonly nodeIndex = new Map<string, SourceIntegrationNode>();
  constructor(readonly limits: SourceImportLimits) {}
  addNode(kind: SourceIntegrationNode["kind"], label: string, source: SourceSpan, type: StaticEvidenceType, confidence: StaticConfidence = "syntax", attributes: Partial<Pick<SourceIntegrationNode, "adapter" | "operation" | "identity" | "origin">> = {}): SourceIntegrationNode {
    const id = `node_${objectHash({ kind, source, label }).slice(0, 32)}`;
    const existing = this.nodeIndex.get(id);
    if (existing) return existing;
    if (this.nodes.length >= this.limits.maxGraphNodes) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
    const node: SourceIntegrationNode = { id, kind, label, confidence, evidence: { type, source }, ...attributes };
    this.nodes.push(node);
    this.nodeIndex.set(id, node);
    return node;
  }
  addEdge(from: string, to: string, relation: SourceIntegrationEdge["relation"], evidence: SourceEvidence, confidence: StaticConfidence = "syntax"): void {
    const id = `edge_${objectHash({ from, to, relation, evidence }).slice(0, 32)}`;
    if (this.keys.has(id)) return;
    if (this.edges.length >= this.limits.maxGraphEdges) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
    this.keys.add(id);
    this.edges.push({ id, from, to, relation, confidence, evidence });
  }
  addFinding(input: Omit<SourceRiskFinding, "id" | "runtimeEvidenceRequired">): void {
    const id = `risk_${objectHash(input).slice(0, 32)}`;
    if (this.keys.has(id)) return;
    if (this.findings.length >= this.limits.maxFindings) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
    this.keys.add(id);
    this.findings.push({ id, ...input, runtimeEvidenceRequired: true });
  }
  merge(fragment: InspectionFragment): void {
    if (this.nodes.length + fragment.nodes.length > this.limits.maxGraphNodes || this.edges.length + fragment.edges.length > this.limits.maxGraphEdges || this.findings.length + fragment.findings.length > this.limits.maxFindings) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
    this.nodes.push(...fragment.nodes); this.edges.push(...fragment.edges); this.findings.push(...fragment.findings); this.imports.push(...fragment.imports);
    for (const node of fragment.nodes) this.nodeIndex.set(node.id, node);
  }
  fragment(): InspectionFragment { return { nodes: this.nodes, edges: this.edges, findings: this.findings, imports: this.imports }; }
}
export function wholeFileSource(file: InspectedSource): SourceSpan { return sourceSpan(file.manifest.path, file.manifest.hash, file.content, 0, file.content.length); }
export function graphResult(builder: GraphBuilder, coverage: SourceIntegrationGraph["coverage"]): SourceIntegrationGraph {
  return {
    schemaVersion: SOURCE_GRAPH_SCHEMA, mode: "static", runtimeObserved: false,
    nodes: builder.nodes, edges: builder.edges, findings: builder.findings, coverage,
    limitations: [
      "Source syntax and static inferences are not runtime observations, reproduced defects or provider guarantees.",
      "SDK import recognition does not verify dependency versions, operation contracts, transport behavior or endpoint support.",
      "A request identity field can be present while changing between retries; durable business identity requires separate proof.",
      "Dynamic dispatch, external libraries, framework registration and cross-function control flow can leave unresolved edges.",
      "Unrecognized or delegated verification and capture checks require review; absence from this partial graph is not proof of absence.",
      "No imported code, dependency, package script or outbound destination was executed or contacted.",
    ],
  };
}
