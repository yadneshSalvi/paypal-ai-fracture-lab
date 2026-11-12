import { LabError } from "../../service/src/errors";
export class SourceExecutionError extends LabError {
  constructor(code: string, message: string, status = 409, readonly sourcePath: string | null = null) {
    super(code, message, status); this.name = "SourceExecutionError";
  }
}
export const executionDenied = () => new SourceExecutionError("SOURCE_EXECUTION_ACCESS_DENIED", "This execution is unavailable within the original private developer grant.", 404);
export const integrityFailed = () => new SourceExecutionError("SOURCE_EXECUTION_INTEGRITY", "The immutable execution record failed its integrity check. No source or executable bundle was returned.");
