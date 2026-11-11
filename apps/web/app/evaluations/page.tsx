import type {Metadata} from 'next';
import { FractureConsole } from "@/components/fracture-console";
export const metadata:Metadata={title:'Context Study',description:'Explore a preregistered 600-candidate study of payment integration context, with original submissions, independent SDK checks, and sealed evidence.'};
export default function Page() { return <FractureConsole screen="evaluations" />; }
