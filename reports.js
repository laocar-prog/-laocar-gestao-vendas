function laocarPrint(title,headers,rows,summary,win,options={}){
 const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!win)throw Error('Libere a abertura da janela para imprimir o relatório.');
 const tr=row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
 const foot=row=>'<tfoot>'+tr(row)+'</tfoot>';
 const table=(data,total)=>'<table><thead>'+tr(headers)+'</thead><tbody>'+data.map(tr).join('')+'</tbody>'+(total?foot(total):'')+'</table>';
 const content=options.groups?options.groups.map(g=>'<section class="seller"><h2>'+esc(g.name)+'</h2><p>'+esc(g.summary)+'</p>'+table(g.rows,g.footer)+'</section>').join('')+'<h2>Total geral</h2>'+table([],options.footer):table(rows,options.footer);
 win.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>@page{size:A4 landscape;margin:14mm}body{font:12px Arial,sans-serif;color:#17212b}h1{font-size:20px}h2{font-size:16px}table{border-collapse:collapse;width:100%;margin-bottom:18px}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left;overflow-wrap:anywhere}thead td{background:#eef2f5;font-weight:bold}tfoot td{border-top:2px solid #17212b;background:#eef2f5;font-weight:bold}.summary{margin:12px 0;font-weight:bold}.actions{margin:10px 0}.seller{break-before:page}.seller:first-of-type{break-before:auto}tr{break-inside:avoid}@media print{.actions{display:none}tfoot{display:table-row-group}}</style></head><body><div class="actions"><button onclick="window.print()">Imprimir / salvar PDF</button></div><h1>'+esc(title)+'</h1><p>Gerado em '+esc(new Date().toLocaleString('pt-BR'))+'</p><div class="summary">'+esc(summary)+'</div>'+content+'</body></html>');win.document.close();win.focus();
}
const laocarMoney=u=>Number(u||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const laocarStatus=u=>({draft:'PENDENTE',pending:'PENDENTE',completed:'EFETIVADA',cancelled:'CANCELADA',available:'DISPONÍVEL',reserved:'RESERVADO',sold:'VENDIDO'})[u]||u||'—';
function laocarCents(value){const n=Number(value??0);return Number.isFinite(n)?Math.round(n*100):0}
function laocarSum(rows,field){return rows.reduce((n,row)=>n+laocarCents(row[field]),0)/100}
function laocarMonthNow(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date());return parts.find(x=>x.type==='year').value+'-'+parts.find(x=>x.type==='month').value}
function laocarPeriod(month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))throw Error('Selecione um mês válido para o fechamento.');const [y,m]=month.split('-').map(Number);return {start:month+'-01',end:month+'-'+String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0'),label:month.slice(5)+'/'+month.slice(0,4)}}
async function laocarRows(store,table,fields){const rows=[];for(let start=0;;start+=1000){const {data,error}=await F.from(table).select(fields).eq('store_id',store).order('id',{ascending:true}).range(start,start+999);if(error)throw error;rows.push(...data||[]);if(!data||data.length<1000)return rows}}
function laocarSaleTotals(rows){const completed=rows.filter(s=>s.status==='completed'),pending=rows.filter(s=>['draft','pending'].includes(s.status)),cancelled=rows.filter(s=>s.status==='cancelled');return `${rows.length} venda(s). Efetivadas: ${laocarMoney(laocarSum(completed,'sale_price'))}; pendentes: ${laocarMoney(laocarSum(pending,'sale_price'))}; canceladas: ${laocarMoney(laocarSum(cancelled,'sale_price'))}. A soma dos valores listados inclui todos os status; faturamento considera somente efetivadas.`}
async function laocarReport(store,type,win,options={}){
 if(type==='estoque'||type==='vendidos'){
  let vehicles=await laocarRows(store,type==='vendidos'?'sold_vehicle_inventory':'vehicles','id,plate,make,model,model_year,status,sale_price');
  if(type==='estoque')vehicles=vehicles.filter(v=>v.status!=='sold');
  if(options.stockStatus&&options.stockStatus!=='all')vehicles=vehicles.filter(v=>v.status===options.stockStatus);
  if(options.search){const q=options.search.toLowerCase();vehicles=vehicles.filter(v=>`${v.make||''} ${v.model||''} ${v.plate||''}`.toLowerCase().includes(q))}
  return laocarPrint(type==='vendidos'?'Relatório de veículos vendidos':'Relatório de estoque ativo',['Placa','Marca','Modelo','Ano','Situação','Preço'],vehicles.map(v=>[v.plate,v.make,v.model,v.model_year,laocarStatus(v.status),laocarMoney(v.sale_price)]),`${vehicles.length} veículo(s). ${type==='estoque'?'Veículos vendidos estão no arquivo separado.':'Valores do cadastro do veículo.'}`,win,{footer:['TOTAL','','','',vehicles.length+' veículo(s)',laocarMoney(laocarSum(vehicles,'sale_price'))]});
 }
 if(type==='clientes'){const rows=await laocarRows(store,'customers','id,full_name,cpf,mobile_phone,email,city,state');return laocarPrint('Relatório de clientes',['Nome','CPF','Telefone','E-mail','Cidade','UF'],rows.map(r=>[r.full_name,r.cpf,r.mobile_phone,r.email,r.city,r.state]),`${rows.length} cliente(s)`,win)}
 const [sales,vehicles,customers,parties]=await Promise.all([laocarRows(store,'sales','id,sale_number,sale_date,vehicle_id,customer_id,document_party_id,sale_price,purchase_cost,status'),laocarRows(store,'vehicles','id,plate,make,model'),laocarRows(store,'customers','id,full_name'),laocarRows(store,'document_parties','id,name,kind,phone,email')]);
 const period=options.month?laocarPeriod(options.month):null;
 if(type==='faturamento'&&!period)throw Error('Selecione o mês do fechamento.');
 let selected=sales.filter(s=>!period||(s.sale_date>=period.start&&s.sale_date<=period.end));
 if(options.sellerId&&options.sellerId!=='all')selected=selected.filter(s=>options.sellerId==='__none__'?!s.document_party_id:s.document_party_id===options.sellerId);
 selected.sort((a,b)=>String(a.sale_date||'').localeCompare(String(b.sale_date||''))||String(a.sale_number||'').localeCompare(String(b.sale_number||'')));
 const vehicleMap=new Map(vehicles.map(v=>[v.id,v])),customerMap=new Map(customers.map(v=>[v.id,v])),partyMap=new Map(parties.map(v=>[v.id,v]));
 const sellerName=id=>id?(partyMap.get(id)?.name||'Vendedor não disponível'):'Sem vendedor vinculado';
 if(type==='vendedores'){
  const ids=[...new Set([...parties.filter(x=>x.kind==='seller').map(x=>x.id),...selected.map(x=>x.document_party_id||'__none__')])];
  const completed=selected.filter(s=>s.status==='completed');
  return laocarPrint('Relatório de vendedores',['Vendedor','Telefone','E-mail','Vendas efetivadas','Faturamento'],ids.map(id=>{const person=partyMap.get(id),list=completed.filter(s=>(s.document_party_id||'__none__')===id);return [sellerName(id==='__none__'?null:id),person?.phone,person?.email,list.length,laocarMoney(laocarSum(list,'sale_price'))]}),period?'Período: '+period.label:'Todos os períodos',win,{footer:['TOTAL','','',completed.length,laocarMoney(laocarSum(completed,'sale_price'))]});
 }
 if(type==='faturamento')selected=selected.filter(s=>s.status==='completed');
 const headers=['Nº','Data','Veículo','Cliente','Vendedor','Status','Valor'];if(type==='faturamento')headers.push('Custo registrado','Resultado bruto');
 const costKnown=s=>s.purchase_cost!==null&&s.purchase_cost!==undefined&&s.purchase_cost!=='';
 const row=s=>{const v=vehicleMap.get(s.vehicle_id),c=customerMap.get(s.customer_id),out=[s.sale_number,s.sale_date?String(s.sale_date).split('-').reverse().join('/'):'—',`${v?.make||''} ${v?.model||''} ${v?.plate||''}`,c?.full_name,sellerName(s.document_party_id),laocarStatus(s.status),laocarMoney(s.sale_price)];if(type==='faturamento')out.push(costKnown(s)?laocarMoney(s.purchase_cost):'Não informado',costKnown(s)?laocarMoney((laocarCents(s.sale_price)-laocarCents(s.purchase_cost))/100):'Não apurado');return out};
 const footer=list=>['TOTAL','','','','',list.length+' venda(s)',laocarMoney(laocarSum(list,'sale_price'))];
 let summary=(period?'Período: '+period.label+'. ':'Todos os períodos. ')+laocarSaleTotals(selected),total=footer(selected);
 if(type==='faturamento'){
  const missing=selected.filter(s=>!costKnown(s)).length,cost=laocarSum(selected.filter(costKnown),'purchase_cost'),revenue=laocarSum(selected,'sale_price');
  total.push(laocarMoney(cost)+(missing?' (parcial)':''),missing?'Não apurado':laocarMoney((laocarCents(revenue)-laocarCents(cost))/100));
  summary=`Fechamento mensal: ${period.label}. ${selected.length} venda(s) efetivada(s); faturamento ${laocarMoney(revenue)}. Custos registrados ${laocarMoney(cost)}; ${missing} venda(s) sem custo. Apuração pela data do pedido de venda; não representa recebimentos de parcelas nem lucro líquido.`;
 }
 if(type==='vendas-vendedor'){
  const groups=new Map();for(const s of selected){const id=s.document_party_id||'__none__';if(!groups.has(id))groups.set(id,[]);groups.get(id).push(s)}
  if(options.sellerId&&options.sellerId!=='all'&&!groups.size)groups.set(options.sellerId,[]);
  const printable=[...groups].map(([id,list])=>({name:sellerName(id==='__none__'?null:id),rows:list.map(row),footer:footer(list),summary:laocarSaleTotals(list)})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  return laocarPrint('Relatório de vendas por vendedor',headers,[],summary,win,{groups:printable,footer:total});
 }
 return laocarPrint(type==='faturamento'?'Fechamento mensal de faturamento':'Relatório de vendas',headers,selected.map(row),summary,win,{footer:total});
}
function LaocarSalesReportTools({storeId}){
 const [month,setMonth]=Z.useState(''),[seller,setSeller]=Z.useState('all'),[sellers,setSellers]=Z.useState([]),[error,setError]=Z.useState(''),[busy,setBusy]=Z.useState(false);
 Z.useEffect(()=>{let active=true;laocarRows(storeId,'document_parties','id,name,kind').then(rows=>{if(active)setSellers(rows.filter(r=>r.kind==='seller'))}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[storeId]);
 async function print(){const win=window.open('','_blank');setBusy(true);setError('');try{await laocarReport(storeId,'vendas-vendedor',win,{month,sellerId:seller})}catch(e){win?.close();setError(e.message)}finally{setBusy(false)}}
 return p.createElement('div',{className:'panel'},p.createElement('h3',null,'Relatório de vendas por vendedor'),p.createElement('div',{className:'toolbar'},p.createElement('label',null,'Mês (opcional)',p.createElement('input',{type:'month',value:month,onChange:e=>setMonth(e.target.value)})),p.createElement('button',{type:'button',onClick:()=>setMonth('')},'Todos os meses'),p.createElement('label',null,'Vendedor',p.createElement('select',{value:seller,onChange:e=>setSeller(e.target.value)},p.createElement('option',{value:'all'},'Todos — relatório separado por vendedor'),p.createElement('option',{value:'__none__'},'Sem vendedor vinculado'),sellers.map(s=>p.createElement('option',{key:s.id,value:s.id},s.name)))),p.createElement('button',{type:'button',disabled:busy,onClick:print},busy?'Gerando…':'Imprimir vendas por vendedor')),error&&p.createElement('p',{className:'notice'},error));
}
function op({storeId:u}){
 const [a,o]=Z.useState(null),[i,c]=Z.useState(null),[d,f]=Z.useState(false),[y,g]=Z.useState(''),[month,setMonth]=Z.useState(laocarMonthNow()),[refreshKey,setRefreshKey]=Z.useState(0);
 async function h(type){const win=window.open('','_blank');try{g('');await laocarReport(u,type,win,{month:type==='faturamento'?month:null})}catch(e){win?.close();g(e.message||'Erro ao gerar relatório.')}}
 Z.useEffect(()=>{let active=true;f(true);g('');o(null);(async()=>{try{const period=laocarPeriod(month),[sales,inventory]=await Promise.all([F.rpc('sales_report',{p_store_id:u,p_start_date:period.start,p_end_date:period.end}),F.rpc('inventory_report',{p_store_id:u})]);if(sales.error)throw sales.error;if(inventory.error)throw inventory.error;if(active){o(sales.data);c(inventory.data)}}catch(e){if(active)g(e.message)}finally{if(active)f(false)}})();return()=>{active=false}},[u,month,refreshKey]);
 const sales=a?.summary||a?.[0]?.summary||a||{},inventory=i?.summary||i?.[0]?.summary||i||{};
 return p.createElement('section',null,p.createElement('div',{className:'toolbar'},p.createElement('h2',null,'Relatórios'),p.createElement('button',{type:'button',disabled:d,onClick:()=>setRefreshKey(n=>n+1)},'Atualizar')),p.createElement('div',{className:'toolbar report-actions'},[['estoque','Estoque ativo'],['vendidos','Veículos vendidos'],['clientes','Clientes'],['vendas','Vendas'],['vendedores','Vendedores']].map(([type,label])=>p.createElement('button',{key:type,type:'button',onClick:()=>h(type)},'Imprimir '+label))),p.createElement(LaocarSalesReportTools,{storeId:u}),p.createElement('div',{className:'panel'},p.createElement('h3',null,'Fechamento mensal de faturamento'),p.createElement('div',{className:'toolbar'},p.createElement('label',null,'Mês do fechamento',p.createElement('input',{type:'month',required:true,value:month,onChange:e=>setMonth(e.target.value)})),p.createElement('button',{type:'button',disabled:d||!month,onClick:()=>h('faturamento')},'Imprimir fechamento mensal')),p.createElement('p',{className:'muted'},'Vendas efetivadas pela data do pedido de venda. Custos ausentes são identificados no relatório.'),p.createElement('div',{className:'report-grid'},p.createElement(Ct,{title:'Vendas efetivadas no mês',value:d?'…':sales.sales_count??0}),p.createElement(Ct,{title:'Faturamento do mês',value:d?'…':laocarMoney(sales.revenue)}),p.createElement(Ct,{title:'Ticket médio do mês',value:d?'…':laocarMoney(sales.average_sale)}))),y&&p.createElement('p',{className:'notice'},y),p.createElement('div',{className:'report-grid'},p.createElement(Ct,{title:'Estoque ativo',value:Number(inventory.available||0)+Number(inventory.reserved||0)}),p.createElement(Ct,{title:'Disponíveis',value:inventory.available??0}),p.createElement(Ct,{title:'Reservados',value:inventory.reserved??0}),p.createElement(Ct,{title:'Arquivo de vendidos',value:inventory.sold??0}),p.createElement(Ct,{title:'Valor do estoque ativo',value:laocarMoney(inventory.stock_sale_value)})));
}
