const creators = [
  {id:'1',name:'Lia Martins',handle:'@liacria',niche:'Moda consciente',category:'Moda',bio:'Looks reais, brechós e criatividade no dia a dia.',initials:'LM',color:'#65517b',posts:'3x por semana'},
  {id:'2',name:'Rafa Pixel',handle:'@rafapixel',niche:'Games e tecnologia',category:'Games',bio:'Setup acessível, gameplay e dicas para iniciantes.',initials:'RP',color:'#315e68',posts:'Todo dia'},
  {id:'3',name:'Bia em Movimento',handle:'@bia.movimento',niche:'Bem-estar',category:'Fitness',bio:'Treinos possíveis e hábitos que cabem na rotina.',initials:'BM',color:'#80543d',posts:'4x por semana'},
  {id:'4',name:'João Criativo',handle:'@joaocriativo',niche:'Pequenos negócios',category:'Negócios',bio:'Ideias práticas para quem está começando do zero.',initials:'JC',color:'#49633d',posts:'2x por semana'}
];
const challenges = [
  {id:'c1',title:'Mostre os bastidores',detail:'Grave um story curto mostrando como você prepara seu próximo conteúdo.',time:'10 min',tag:'Stories'},
  {id:'c2',title:'Converse com sua comunidade',detail:'Responda comentários com atenção e faça uma pergunta para continuar a conversa.',time:'15 min',tag:'Comunidade'},
  {id:'c3',title:'Teste um novo começo',detail:'Crie duas opções de primeira frase para o próximo Reel e escolha a mais clara.',time:'20 min',tag:'Reels'}
];
const tips = [
  {id:'t1',title:'Comece pelo público, não pelo algoritmo',body:'Defina quem você quer ajudar ou entreter. Liste três dúvidas reais desse público e transforme cada uma em uma ideia de conteúdo.'},
  {id:'t2',title:'Faça os primeiros segundos valerem',body:'Abra o vídeo com uma promessa específica, uma pergunta ou o resultado que a pessoa vai aprender a alcançar. Evite introduções longas.'},
  {id:'t3',title:'Consistência que cabe na sua rotina',body:'Escolha uma frequência sustentável. É melhor publicar com qualidade de forma regular do que assumir um calendário impossível de manter.'},
  {id:'t4',title:'Convide para uma conversa',body:'Termine suas publicações com uma pergunta verdadeira e fácil de responder. Depois, reserve tempo para ouvir e responder às pessoas.'}
];
const suggestions = [
  {title:'Moda e estilo consciente',description:'Descubra criadores que compartilham combinações, garimpos e consumo consciente.',tags:['modaconsciente','lookdodia','modabrasileira']},
  {title:'Games e tecnologia',description:'Encontre comunidades de jogos, setups, análises e novidades tech.',tags:['gamesbrasil','gamersbr','tecnologia']},
  {title:'Fitness e bem-estar',description:'Veja ideias de treinos possíveis, hábitos saudáveis e motivação realista.',tags:['treinoemcasa','vidasaudavel','bemestar']},
  {title:'Pequenos negócios',description:'Conheça empreendedores, marcas independentes e dicas para quem está começando.',tags:['pequenosnegocios','empreendedorismo','negociolocal']},
  {title:'Criação de conteúdo',description:'Busque referências de Reels, fotografia mobile, edição e storytelling.',tags:['criacaodeconteudo','reelsbrasil','fotografiamobile']},
  {title:'Comunidades da sua região',description:'Use hashtags da sua cidade ou estado para descobrir pessoas e projetos próximos.',tags:['criadoresbrasil','empreendedoresbrasil','comerciolocal']}
];
const categories = ['Todos','Moda','Games','Fitness','Negócios'];
const state = {
  page:'explorar',category:'Todos',query:'',
  saved:new Set(readArray('impulso-saved')),
  completed:new Set(readArray('impulso-completed')),
  openedTip:'t1',
  handle:localStorage.getItem('impulso-handle') || '',
  promotionEnabled:localStorage.getItem('impulso-promotion-enabled') === 'true',
  followers:readArray('impulso-followers')
};
function readArray(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
function saveState(){localStorage.setItem('impulso-saved',JSON.stringify(Array.from(state.saved)));localStorage.setItem('impulso-completed',JSON.stringify(Array.from(state.completed)))}
function initials(value){return value?value.replace('@','').slice(0,2).toUpperCase():'EU'}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(function(){el.classList.remove('show')},2400)}
function go(page){
  const allowed=['explorar','desafios','dicas','perfil','seguidores','sugestoes','instagram'];if(!allowed.includes(page))return;
  state.page=page;document.querySelectorAll('.page').forEach(function(el){el.classList.toggle('active',el.id==='page-'+page)});
  document.querySelectorAll('.nav-item').forEach(function(el){el.classList.toggle('active',el.dataset.page===page)});
  const labels={explorar:'Explorar',desafios:'Desafios',dicas:'Dicas',perfil:'Meu perfil',seguidores:'Seguidores',sugestoes:'Sugestões para seguir',instagram:'Instagram'};
  document.getElementById('crumbCurrent').textContent=labels[page];renderAll();
  if(page==='instagram')loadInstagramStatus();
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderCategories(){
  document.getElementById('categoryFilters').innerHTML=categories.map(function(c){return '<button class="category-chip '+(state.category===c?'active':'')+'" data-category="'+c+'">'+c+'</button>'}).join('');
}
function renderCreators(){
  const q=state.query.trim().toLowerCase();
  const matches=creators.filter(function(c){return (state.category==='Todos'||c.category===state.category)&&(!q||(c.name+' '+c.handle+' '+c.niche+' '+c.bio).toLowerCase().includes(q))});
  document.getElementById('creatorCount').textContent=String(matches.length).padStart(2,'0')+' '+(matches.length===1?'perfil':'perfis');
  document.getElementById('creatorGrid').innerHTML=matches.length?matches.map(function(c){
    return '<article class="creator-card"><div class="creator-head"><div class="creator-avatar" style="background:'+c.color+'">'+c.initials+'</div><div class="creator-id"><strong>'+escapeHtml(c.name)+'</strong><span>'+escapeHtml(c.handle)+' · '+escapeHtml(c.niche)+'</span></div><span class="category-label">'+escapeHtml(c.category)+'</span></div><p class="creator-bio">'+escapeHtml(c.bio)+'</p><div class="creator-footer"><span class="frequency">◷ &nbsp;'+escapeHtml(c.posts)+'</span><button class="save-button '+(state.saved.has(c.id)?'saved':'')+'" data-save="'+c.id+'">'+(state.saved.has(c.id)?'✓ Salvo':'+ Conectar')+'</button></div></article>';
  }).join(''):'<div class="empty-rail">Nenhum perfil encontrado. Tente outro termo ou categoria.</div>';
}
function renderChallenges(){
  const done=state.completed.size;document.getElementById('challengeProgress').textContent=done+'/3';
  document.getElementById('progressFill').style.width=(done/3*100)+'%';
  document.getElementById('progressMessage').textContent=done===3?'Excelente! Você concluiu todos os desafios de hoje.':done===0?'Escolha um desafio e comece por algo simples.':'Você concluiu '+done+' de 3 desafios. Continue no seu ritmo.';
  document.getElementById('challengeGrid').innerHTML=challenges.map(function(c,i){
    const isDone=state.completed.has(c.id);
    return '<article class="challenge-card '+(isDone?'done':'')+'"><div class="challenge-top"><span class="challenge-number">0'+(i+1)+'</span><span class="challenge-tag">'+c.tag+'</span></div><h3>'+c.title+'</h3><p>'+c.detail+'</p><div class="challenge-bottom"><span class="challenge-time">◷ &nbsp;'+c.time+'</span><button class="complete-button '+(isDone?'done':'')+'" data-complete="'+c.id+'">'+(isDone?'✓ Concluído':'Marcar como feito')+'</button></div></article>';
  }).join('');
}
function renderTips(){
  document.getElementById('tipsList').innerHTML=tips.map(function(t,i){
    const open=state.openedTip===t.id;
    return '<article class="tip-item '+(open?'open':'')+'" data-tip="'+t.id+'"><div class="tip-header"><span class="tip-index">DICA 0'+(i+1)+'</span><span class="tip-toggle">'+(open?'−':'+')+'</span></div><h3>'+t.title+'</h3>'+(open?'<p class="tip-body">'+t.body+'</p>':'')+'</article>';
  }).join('');
}
function renderProfile(){
  const h=state.handle;document.getElementById('instagramHandle').value=h.replace(/^@/,'');
  document.getElementById('profileDisplayName').textContent=h||'Criador em construção';
  document.getElementById('profileDisplayHandle').textContent=h?'Seu espaço no Impulso':'Adicione seu @ do Instagram';
  ['profileAvatar','sidebarAvatar','topAvatar','promotionAvatar'].forEach(function(id){const el=document.getElementById(id);if(el)el.textContent=initials(h)});
  document.getElementById('sidebarHandle').textContent=h||'Seu perfil';document.getElementById('topHandle').textContent=h||'Meu perfil';
  document.getElementById('promotionHandle').textContent=h||'Adicione seu @ do Instagram';
  const active=state.promotionEnabled;document.getElementById('promotionState').textContent=active?'VITRINE ATIVA':'PAUSADA';
  document.getElementById('promotionState').classList.toggle('active',active);
  document.getElementById('promotionVisibility').textContent=active?'Divulgação ativada neste navegador':'Sua vitrine está pausada';
  const button=document.getElementById('togglePromotion');button.innerHTML=active?'Pausar divulgação <span>Ⅱ</span>':'Começar a divulgar meu perfil <span>↗</span>';
  button.classList.toggle('promotion-on',active);
}
function renderRail(){
  document.getElementById('savedStat').textContent=state.saved.size;document.getElementById('completedStat').textContent=state.completed.size;
  document.getElementById('railSaved').textContent=state.saved.size;document.getElementById('railDone').textContent=state.completed.size+' de 3';
  const list=creators.filter(function(c){return state.saved.has(c.id)});
  document.getElementById('savedPreview').innerHTML=list.length?list.slice(0,4).map(function(c){return '<div class="saved-person"><div class="creator-avatar" style="background:'+c.color+'">'+c.initials+'</div><div><strong>'+c.name+'</strong><small>'+c.handle+'</small></div></div>'}).join(''):'<p class="empty-rail">Seus perfis favoritos aparecem aqui.</p>';
}
function renderFollowers(){
  const entries=state.followers.slice().sort(function(a,b){return new Date(b.addedAt)-new Date(a.addedAt)});
  document.getElementById('followerTotal').textContent=entries.length.toLocaleString('pt-BR');
  document.getElementById('followerLatest').textContent=entries.length?new Date(entries[0].addedAt).toLocaleDateString('pt-BR'):'—';
  document.getElementById('followerListCount').textContent=entries.length+' '+(entries.length===1?'pessoa':'pessoas');
  document.getElementById('followerList').innerHTML=entries.length?entries.map(function(person){
    return '<article class="follower-row"><div class="follower-avatar">'+escapeHtml(initials(person.handle))+'</div><div class="follower-person-copy"><strong>'+escapeHtml(person.handle)+'</strong><span>Confirmou que encontrou você pelo Impulso</span></div><time>'+new Date(person.addedAt).toLocaleDateString('pt-BR')+'</time><button class="follower-remove" data-remove-follower="'+escapeHtml(person.id)+'">Remover</button></article>';
  }).join(''):'<div class="follower-empty"><span>♧</span><strong>Seu histórico começa aqui.</strong><p>Quando alguém confirmar que seguiu você após conhecer seu perfil pelo Impulso, registre o @ nessa página.</p></div>';
}
function renderSuggestions(){
  document.getElementById('suggestionGrid').innerHTML=suggestions.map(function(item){
    const links=item.tags.map(function(tag){return '<a href="https://www.instagram.com/explore/tags/'+encodeURIComponent(tag)+'/" target="_blank" rel="noopener noreferrer">#'+escapeHtml(tag)+'</a>'}).join('');
    return '<article class="suggestion-card"><div class="suggestion-card-icon">✧</div><h3>'+item.title+'</h3><p>'+item.description+'</p><div class="suggestion-tags">'+links+'</div></article>';
  }).join('');
}
function renderAll(){renderCategories();renderCreators();renderChallenges();renderTips();renderProfile();renderRail();renderFollowers();renderSuggestions()}
function instagramProfileUrl(){
  if(!state.handle){toast('Salve seu @ do Instagram antes de divulgar.');go('perfil');document.getElementById('instagramHandle').focus();return null}
  return 'https://www.instagram.com/'+encodeURIComponent(state.handle.replace(/^@/,'').trim())+'/';
}
document.addEventListener('click',function(e){
  const nav=e.target.closest('[data-page]');if(nav){go(nav.dataset.page);return}
  const goButton=e.target.closest('[data-go]');if(goButton){go(goButton.dataset.go);return}
  const category=e.target.closest('[data-category]');if(category){state.category=category.dataset.category;renderCategories();renderCreators();return}
  const save=e.target.closest('[data-save]');if(save){const id=save.dataset.save;state.saved.has(id)?state.saved.delete(id):state.saved.add(id);saveState();renderCreators();renderRail();toast(state.saved.has(id)?'Perfil adicionado às suas conexões.':'Perfil removido das conexões.');return}
  const complete=e.target.closest('[data-complete]');if(complete){const id=complete.dataset.complete;state.completed.has(id)?state.completed.delete(id):state.completed.add(id);saveState();renderChallenges();renderRail();toast(state.completed.has(id)?'Desafio concluído. Mandou bem!':'Desafio reaberto.');return}
  const tip=e.target.closest('[data-tip]');if(tip){state.openedTip=state.openedTip===tip.dataset.tip?null:tip.dataset.tip;renderTips();return}
  const remove=e.target.closest('[data-remove-follower]');if(remove){state.followers=state.followers.filter(function(p){return p.id!==remove.dataset.removeFollower});localStorage.setItem('impulso-followers',JSON.stringify(state.followers));renderFollowers();toast('Registro removido do histórico.')}
});
document.getElementById('creatorSearch').addEventListener('input',function(e){state.query=e.target.value;renderCreators()});
document.getElementById('clearFilters').addEventListener('click',function(){state.category='Todos';state.query='';document.getElementById('creatorSearch').value='';renderCategories();renderCreators()});
document.getElementById('followerForm').addEventListener('submit',function(e){
  e.preventDefault();const field=document.getElementById('followerHandle');const clean=field.value.trim().replace(/^@/,'').replace(/\s/g,'');
  if(!/^[a-zA-Z0-9._]{1,30}$/.test(clean)){toast('Informe um @ válido do Instagram.');field.focus();return}
  const handle='@'+clean;if(state.followers.some(function(p){return p.handle.toLowerCase()===handle.toLowerCase()})){toast('Esse perfil já está no seu histórico.');return}
  state.followers.push({id:'f-'+Date.now(),handle:handle,addedAt:new Date().toISOString()});
  localStorage.setItem('impulso-followers',JSON.stringify(state.followers));field.value='';renderFollowers();toast('Confirmação adicionada ao seu histórico.');
});
document.getElementById('saveProfile').addEventListener('click',function(){
  const clean=document.getElementById('instagramHandle').value.trim().replace(/^@/,'').replace(/\s/g,'');
  if(!/^[a-zA-Z0-9._]{1,30}$/.test(clean)){toast('Informe um usuário válido: letras, números, ponto ou underline.');return}
  state.handle='@'+clean;localStorage.setItem('impulso-handle',state.handle);renderProfile();toast('Seu perfil foi salvo neste computador.');
});
document.getElementById('togglePromotion').addEventListener('click',function(){
  if(!instagramProfileUrl())return;state.promotionEnabled=!state.promotionEnabled;
  localStorage.setItem('impulso-promotion-enabled',String(state.promotionEnabled));renderProfile();
  toast(state.promotionEnabled?'Sua vitrine foi ativada neste navegador.':'Sua divulgação foi pausada.');
});
document.getElementById('shareProfile').addEventListener('click',async function(){
  const url=instagramProfileUrl();if(!url)return;
  const data={title:'Conheça meu Instagram',text:'Conheça meu perfil '+state.handle+' no Instagram. Se o conteúdo fizer sentido para você, siga para acompanhar!',url:url};
  try{if(navigator.share){await navigator.share(data);toast('Convite aberto para compartilhamento.')}
  else if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(data.text+' '+url);toast('Link do Instagram copiado para compartilhar.')}
  else{window.prompt('Copie o link do seu perfil:',url)}}catch(error){if(error.name!=='AbortError')toast('Não foi possível compartilhar agora.')}
});
document.getElementById('helpButton').addEventListener('click',function(){document.getElementById('aboutModal').classList.add('show')});
function closeModal(){document.getElementById('aboutModal').classList.remove('show')}
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('understoodButton').addEventListener('click',closeModal);
document.getElementById('aboutModal').addEventListener('click',function(e){if(e.target.id==='aboutModal')closeModal()});
document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();go('explorar');document.getElementById('creatorSearch').focus()}if(e.key==='Escape')closeModal()});

const instagramMetricIds=['igFollowers','igViews','igReach','igEngaged','igInteractions','igMediaCount'];
function formatNumber(value){return value===null||value===undefined?'—':Number(value).toLocaleString('pt-BR')}
function setInstagramMetrics(profile,insights){
  const values={};(insights&&insights.data||[]).forEach(function(item){values[item.name]=item.total_value&&item.total_value.value!==undefined?item.total_value.value:(item.values&&item.values[0]?item.values[0].value:undefined)});
  document.getElementById('igFollowers').textContent=formatNumber(profile&&profile.followers_count);
  document.getElementById('igViews').textContent=formatNumber(values.views);
  document.getElementById('igReach').textContent=formatNumber(values.reach);
  document.getElementById('igEngaged').textContent=formatNumber(values.accounts_engaged);
  document.getElementById('igInteractions').textContent=formatNumber(values.total_interactions);
  document.getElementById('igMediaCount').textContent=formatNumber(profile&&profile.media_count);
}
function setInstagramDisconnected(message){
  document.getElementById('igConnectionTitle').textContent='Conecte seu Instagram';
  document.getElementById('igConnectionText').textContent=message||'A autorização acontece na página do Instagram. O Impulso nunca pede sua senha.';
  document.getElementById('igConnectionState').textContent='NÃO CONECTADO';
  document.getElementById('igConnectionState').classList.remove('connected');
  document.getElementById('connectInstagram').hidden=false;document.getElementById('disconnectInstagram').hidden=true;document.getElementById('refreshInstagram').hidden=true;
  instagramMetricIds.forEach(function(id){document.getElementById(id).textContent='—'});
}
async function loadInstagramStatus(){
  try{
    const response=await fetch('/api/instagram/status',{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Servidor não disponível');const data=await response.json();
    if(!data.configured){setInstagramDisconnected('O servidor está ativo, mas ainda falta configurar o aplicativo da Meta no arquivo .env.');document.getElementById('igNotice').textContent='Configure App ID, App Secret e URI de retorno conforme o README. Não compartilhe esses dados.';return}
    if(!data.connected){setInstagramDisconnected(data.message||'Conecte uma conta profissional do Instagram para carregar suas métricas.');return}
    document.getElementById('igConnectionTitle').textContent='@'+(data.profile.username||'Instagram conectado');
    document.getElementById('igConnectionText').textContent='Conta '+(data.profile.account_type||'profissional')+' autorizada. Seus dados são consultados diretamente da API oficial.';
    document.getElementById('igConnectionState').textContent='CONECTADO';document.getElementById('igConnectionState').classList.add('connected');
    document.getElementById('connectInstagram').hidden=true;document.getElementById('disconnectInstagram').hidden=false;document.getElementById('refreshInstagram').hidden=false;
    if(state.handle!=='@'+data.profile.username){state.handle='@'+data.profile.username;localStorage.setItem('impulso-handle',state.handle);renderProfile()}
    setInstagramMetrics(data.profile,null);document.getElementById('igLastUpdated').textContent='Perfil sincronizado';await refreshInstagramInsights();
  }catch(error){setInstagramDisconnected('Para conectar, inicie o servidor do Impulso e abra http://localhost:3000. Abrir o index.html diretamente não habilita OAuth.')}
}
async function refreshInstagramInsights(){
  const button=document.getElementById('refreshInstagram');button.disabled=true;button.textContent='Atualizando…';
  try{
    const response=await fetch('/api/instagram/insights');const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível consultar as métricas.');
    const status=await fetch('/api/instagram/status').then(function(r){return r.json()});setInstagramMetrics(status.profile,data);
    document.getElementById('igLastUpdated').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});toast('Métricas atualizadas pela API do Instagram.');
  }catch(error){toast(error.message||'Falha ao atualizar métricas.')}finally{button.disabled=false;button.textContent='Atualizar métricas ↻'}
}
document.getElementById('connectInstagram').addEventListener('click',function(){if(location.protocol==='file:'){toast('Inicie o servidor pelo terminal; veja o README.');return}window.location.href='/auth/instagram'});
document.getElementById('refreshInstagram').addEventListener('click',refreshInstagramInsights);
document.getElementById('disconnectInstagram').addEventListener('click',async function(){try{await fetch('/api/instagram/disconnect',{method:'POST'});setInstagramDisconnected('Sua conta foi desconectada com segurança.');toast('Instagram desconectado.')}catch{toast('Não foi possível desconectar agora.')}});

const now=new Date();document.getElementById('todayDate').textContent=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(now).toUpperCase().replace('.','');
renderAll();
const oauthResult=new URLSearchParams(location.search).get('instagram');
if(oauthResult==='connected'){toast('Instagram conectado com sucesso!');history.replaceState({},'',location.pathname);loadInstagramStatus()}
else if(oauthResult==='denied'){toast('A autorização do Instagram foi cancelada.')}
else if(oauthResult==='error'){toast('Não foi possível concluir a conexão. Confira o servidor e a configuração da Meta.')}
