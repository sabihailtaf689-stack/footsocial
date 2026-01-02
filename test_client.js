(globalThis.fetch ||= (...args) => import('node-fetch').then(({default: f}) => f(...args)));
(async ()=>{
  const API = 'http://localhost:5000';
  try{
    console.log('registering user alice');
    await fetch(API+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'alice',password:'p'})});
  }catch(e){}
  const r = await fetch(API+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'alice',password:'p'})});
  const j = await r.json(); console.log('login:', j.token? 'ok':'fail'); const token = j.token;
  const post = await fetch(API+'/api/post',{method:'POST',headers:{'Content-Type':'application/json', Authorization: token},body:JSON.stringify({content:'hello world', clipUrl:'', thumbnailUrl:''})});
  console.log('post status', post.status);
  const feed = await fetch(API+'/api/feed',{headers:{ Authorization: token }});
  const posts = await feed.json(); console.log('feed length', Array.isArray(posts)?posts.length: 'err');
  if(posts[0]) console.log('first post user', posts[0].user);
  // profile
  const prof = await fetch(API+'/api/user/alice'); console.log('profile status', prof.status); console.log(await prof.json());
  // follow toggle (self should fail)
  const selfFollow = await fetch(API+'/api/user/' + (posts[0] && posts[0].user && posts[0].user._id?posts[0].user._id:'') + '/follow', { method: 'POST', headers: { Authorization: token } }); console.log('self follow status', selfFollow.status);
} )().catch(e=>{ console.error(e); process.exit(1); });
