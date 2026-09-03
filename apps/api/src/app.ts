import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import {config} from './config.js';
import {routes} from './routes/index.js';

const publicErrorMessage=(message:string)=>{
 if(message.startsWith('QR_INVALID_OR_UNSIGNED'))return 'Não foi possível validar o QR Code. Confira se a imagem pertence a uma folha gerada por este sistema e está nítida.';
 if(message.startsWith('ANSWER_SHEET_NOT_FOUND'))return 'O QR Code foi lido, mas a folha não foi localizada nesta organização.';
 if(message.startsWith('NO_ANSWER_SHEET_FOUND')||message.includes('LAYOUT_MARKERS_NOT_FOUND'))return 'Não foi possível localizar os quatro marcadores da folha. Envie a página inteira ou uma metade sem cortes nos marcadores.';
 if(message.startsWith('OMR_WORKER'))return 'A leitura automática não conseguiu processar esta imagem. Verifique a nitidez, a orientação e tente novamente.';
 if(message.startsWith('STORAGE_UPLOAD_FAILED'))return 'Não foi possível armazenar o arquivo para processamento. Tente novamente.';
 if(message.includes('request body is too large'))return 'O arquivo ultrapassa o limite de 15 MB.';
 return 'Não foi possível concluir a operação.';
};

export async function buildApp(){
 const app=Fastify({logger:true,bodyLimit:config.MAX_UPLOAD_BYTES});
 await app.register(cors,{origin:config.WEB_ORIGIN});
 await app.register(multipart,{limits:{fileSize:config.MAX_UPLOAD_BYTES,files:1}});
 await app.register(routes);
 app.setErrorHandler((error,_request,reply)=>{
  app.log.error(error);
  const status=(error as {statusCode?:number}).statusCode??400;
  reply.code(status).send({message:config.NODE_ENV==='production'?publicErrorMessage(error.message):error.message});
 });
 return app;
}
