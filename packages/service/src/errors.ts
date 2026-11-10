export class LabError extends Error {
  constructor(public readonly code:string,message:string,public readonly status=400,public readonly recoverable=true){super(message);this.name="LabError";}
}
