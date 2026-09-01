import {db} from '../db.js';

export type StudentImportRow={name:string;registration?:string;unit:string;grade:number;className:string;timeMode:'PARTIAL'|'FULL'};

const normalize=(value:string)=>value.trim().toLocaleLowerCase('pt-BR');

export async function importStudents(rows:StudentImportRow[],organizationId:string){
 const [units,classes]=await Promise.all([
  db.educationalUnit.findMany({where:{organizationId}}),
  db.schoolClass.findMany({where:{unit:{organizationId}},orderBy:{schoolYear:'desc'}})
 ]);
 const errors:string[]=[];
 const data=rows.map((row,index)=>{
  const unit=units.find(x=>normalize(x.name)===normalize(row.unit)||normalize(x.code??'')===normalize(row.unit));
  if(!unit){errors.push(`Linha ${index+2}: unidade “${row.unit}” não encontrada.`);return null}
  const schoolClass=classes.find(x=>x.unitId===unit.id&&x.grade===row.grade&&normalize(x.name)===normalize(row.className)&&x.timeMode===row.timeMode);
  if(!schoolClass){errors.push(`Linha ${index+2}: turma “${row.className}” não corresponde à unidade, série e tempo informados.`);return null}
  return {classId:schoolClass.id,name:row.name.trim(),registration:row.registration?.trim()||null};
 });
 if(errors.length)throw new Error(errors.slice(0,10).join(' '));
 await db.student.createMany({data:data.filter((x):x is NonNullable<typeof x>=>Boolean(x))});
 return {imported:data.length};
}
