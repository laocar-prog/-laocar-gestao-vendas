import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const origin='https://glowing-trifle-6161a1.netlify.app';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({error:'Método não permitido.'},405);
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'Entre novamente no sistema.'},401);
  const {data:auth,error:authError}=await admin.auth.getUser(token);
  if(authError||!auth.user)return reply({error:'Sessão inválida.'},401);
  const body=await req.json();
  if(typeof body.store_id!=='string')return reply({error:'Loja inválida.'},400);
  const {data:store,error:storeError}=await admin.from('stores').select('id,owner_user_id').eq('id',body.store_id).single();
  if(storeError||!store||store.owner_user_id!==auth.user.id)return reply({error:'Somente o proprietário pode gerenciar os usuários.'},403);
  if(body.action==='list'){
   const {data:members,error}=await admin.from('store_members').select('user_id,role,created_at').eq('store_id',store.id).order('created_at').limit(500);
   if(error)throw error;
   const ids=(members||[]).map(x=>x.user_id);
   const {data:profiles,error:pe}=ids.length?await admin.from('profiles').select('id,full_name,email').in('id',ids):{data:[],error:null};
   if(pe)throw pe;
   return reply({members:(members||[]).map(m=>({...m,...profiles?.find(p=>p.id===m.user_id)}))});
  }
  if(body.action==='update'||body.action==='remove'){
   if(typeof body.user_id!=='string'||body.user_id===store.owner_user_id)return reply({error:'O proprietário não pode ser alterado ou excluído por esta opção.'},403);
   const {data:member,error:me}=await admin.from('store_members').select('user_id,role').eq('store_id',store.id).eq('user_id',body.user_id).single();
   if(me||!member||member.role!=='seller')return reply({error:'Funcionário não encontrado nesta loja.'},404);
   if(body.action==='update'){
    const name=String(body.name||'').trim();
    if(!name||name.length>150)return reply({error:'Informe um nome válido.'},400);
    const {data:updated,error}=await admin.from('profiles').update({full_name:name}).eq('id',member.user_id).select('id').single();
    if(error||!updated)throw error||Error('Perfil ausente');
    return reply({message:'Funcionário atualizado.'});
   }
   const {data:removed,error}=await admin.from('store_members').delete().eq('store_id',store.id).eq('user_id',member.user_id).eq('role','seller').select('user_id').single();
   if(error||!removed)throw error||Error('Vínculo ausente');
   return reply({message:'Funcionário excluído da loja. O histórico de vendas foi preservado.'});
  }
  if(body.action!=='invite')return reply({error:'Ação inválida.'},400);
  const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>150)return reply({error:'Informe nome e e-mail válidos.'},400);
  if(email===auth.user.email?.toLowerCase())return reply({error:'Seu acesso de proprietário já está cadastrado.'},400);
  // Auth rejects already registered addresses; no existing account is silently added.
  const {data:invite,error:ie}=await admin.auth.admin.generateLink({type:'invite',email,options:{data:{full_name:name},redirectTo:origin}});
  if(ie||!invite.user||!invite.properties?.hashed_token)return reply({error:'Não foi possível gerar o convite. Se este e-mail já possui conta, use um novo e-mail ou solicite o vínculo da conta existente.'},400);
  const {data:existing,error:ee}=await admin.from('store_members').select('store_id,role').eq('user_id',invite.user.id);
  if(ee)throw ee;
  if(existing?.some(m=>m.store_id!==store.id||m.role!=='seller'))return reply({error:'Este usuário já está vinculado a outra loja ou possui acesso administrativo. Nenhum novo acesso foi concedido.'},409);
  const {error:pe}=await admin.from('profiles').upsert({id:invite.user.id,full_name:name,email},{onConflict:'id'});
  if(pe)throw pe;
  if(!existing?.length){const {error:me}=await admin.from('store_members').insert({store_id:store.id,user_id:invite.user.id,role:'seller'});if(me)throw me;}
  return reply({link:origin+'/?employee_invite='+encodeURIComponent(invite.properties.hashed_token),message:'Convite gerado. Copie e envie somente ao funcionário cadastrado. O link expira conforme a configuração de acesso.'});
 }catch{return reply({error:'Não foi possível concluir a operação. Atualize a lista antes de tentar novamente.'},500)}
});
