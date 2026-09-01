import {describe,expect,it} from 'vitest';
import {parseStudentCsv} from '../apps/web/src/lib/studentImport.js';

describe('importação de alunos',()=>{
 it('interpreta o modelo CSV com os campos escolares',()=>{
  const [row]=parseStudentCsv('nome;matricula;unidade;serie;turma;tempo\nMaria da Silva;20260001;Escola Centro;7;7º A;Parcial');
  expect(row).toEqual({name:'Maria da Silva',registration:'20260001',unit:'Escola Centro',grade:7,className:'7º A',timeMode:'PARTIAL'});
 });
 it('aceita tempo integral e série formatada',()=>expect(parseStudentCsv('nome;matricula;unidade;serie;turma;tempo\nJoão;;Escola Norte;8º ano;8º B;Integral')[0].timeMode).toBe('FULL'));
 it('rejeita cabeçalho incompleto',()=>expect(()=>parseStudentCsv('nome;turma\nAna;1º A')).toThrow('Cabeçalho inválido'));
});
