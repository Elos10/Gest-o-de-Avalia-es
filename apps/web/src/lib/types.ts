export type Unit={id:string;name:string;code?:string};
export type SchoolClass={id:string;unitId:string;name:string;grade:number;schoolYear:number;timeMode:'PARTIAL'|'FULL';unit:Unit;_count?:{students:number}};
export type Student={id:string;name:string;registration?:string;classId:string;schoolClass:SchoolClass};
export type Assessment={id:string;number:string;year:number;grade:number;subject:'PORTUGUESE'|'MATHEMATICS'|'SINGLE';timeMode:'PARTIAL'|'FULL';questionCount:number;assessmentDate:string;unit:Unit;schoolClass:SchoolClass;key?:Array<{question:number;choice:string}>;sheets?:Array<{id:string;student?:Student}>;_count?:{key:number;sheets:number}};
export type Processing={id:string;status:string;mimeType:string;createdAt:string;quality?:{alignment?:number};sheet?:{student?:Student;assessment:Assessment};answers?:Answer[];_count?:{answers:number}};
export type Answer={question:number;detectedChoice?:string;finalChoice?:string;status:string;confidence:number;fills:Array<{choice:string;fill:number}>};
export type Result={id:string;correct:number;wrong:number;blank:number;invalid:number;total:number;percentage:number;score:number;finalizedAt:string;sheet:{student?:Student;assessment:Assessment}};
export const subjectLabel=(s:string)=>s==='SINGLE'?'Prova Única':s==='PORTUGUESE'?'Língua Portuguesa':'Matemática';
