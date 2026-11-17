const jwt=require('jsonwebtoken');
module.exports=(req,res,next)=>{
 const header=req.headers.authorization||'';
 if(!header.startsWith('Bearer ')) return res.status(401).json({message:'Please sign in first.'});
 try{req.userId=jwt.verify(header.slice(7),process.env.JWT_SECRET).id;next();}
 catch(e){return res.status(401).json({message:'Your session has expired. Please sign in again.'});}
};
