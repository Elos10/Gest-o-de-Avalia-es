import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import {config} from './config.js';
import {routes} from './routes/index.js';

export async function buildApp(){
 const app=Fastify({logger:true,bodyLimit:config.MAX_UPLOAD_BYTES});
 await app.register(cors,{origin:config.WEB_ORIGIN});
 await app.register(multipart,{limits:{fileSize:config.MAX_UPLOAD_BYTES,files:1}});
 await app.register(routes);
 app.setErrorHandler((error,_request,reply)=>{
  app.log.error(error);
  const status=(error as {statusCode?:number}).statusCode??400;
  reply.code(status).send({message:config.NODE_ENV==='production'?'Não foi possível concluir a operação.':error.message});
 });
 return app;
}
