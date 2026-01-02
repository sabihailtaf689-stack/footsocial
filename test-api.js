(async ()=>{
  const base = 'http://127.0.0.1:5000';
  const rnd = Math.floor(Math.random()*10000);
  const u1 = `ci_tester_${rnd}`;
  const u2 = `ci_other_${rnd}`;
  function j(o){return JSON.stringify(o)}
  const headers = {'Content-Type':'application/json'};
  console.log('Registering',u1);
  await fetch(base+'/api/register',{method:'POST',headers,body:j({username:u1,password:'p'})});
  console.log('Registering',u2);
  await fetch(base+'/api/register',{method:'POST',headers,body:j({username:u2,password:'p'})});

  const login1 = await fetch(base+'/api/login',{method:'POST',headers,body:j({username:u1,password:'p'})});
  const d1 = await login1.json();
  const token1 = d1.token; console.log('token1',!!token1);

  const login2 = await fetch(base+'/api/login',{method:'POST',headers,body:j({username:u2,password:'p'})});
  const d2 = await login2.json();
  const token2 = d2.token; console.log('token2',!!token2);

  const me = await fetch(base+'/api/me',{headers:{Authorization:token1}}).then(r=>r.json());
  console.log('me.username',me.username);

  // create clip
  const clip = await fetch(base+'/api/clip',{method:'POST',headers:{'Content-Type':'application/json',Authorization:token1},body:j({clipUrl:'https://example.com/clip.mp4',thumbnailUrl:'https://example.com/t.jpg',durationSec:12,matchId:'testmatch1',minute:11,tags:['shot']})}).then(r=>r.json());
  console.log('clip created id',clip._id||clip.id||clip);

  // create prediction
  const p = await fetch(base+'/api/match/testmatch1/prediction',{method:'POST',headers:{'Content-Type':'application/json',Authorization:token1},body:j({question:'Goal next 5?',choices:['yes','no'],expiresInSec:300})}).then(r=>r.json());
  console.log('prediction',p._id||p.id||p);

  // submit by other user
  const sub = await fetch(base+`/api/prediction/${p._id}/submit`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:token2},body:j({choice:'yes'})});
  console.log('submit status',sub.status);

  // resolve prediction
  const res = await fetch(base+`/api/prediction/${p._id}/resolve`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:token1},body:j({correctChoice:'yes'})}).then(r=>r.json());
  console.log('resolved',res);

  // leaderboard
  const lb = await fetch(base+'/api/leaderboard').then(r=>r.json());
  console.log('leaderboard top',lb.slice(0,3));

  console.log('All done');
})();
