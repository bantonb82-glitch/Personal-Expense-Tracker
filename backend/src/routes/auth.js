const router=require('express').Router();
const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');
const User=require('../models/User');
function token(user){return jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'7d'});}
router.post('/register',async(req,res)=>{
 try{
  const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
  if(!/^\\S+@\\S+\\.\\S+$/.test(email))return res.status(400).json({message:'Enter a valid email address.'});
  if(password.length<8)return res.status(400).json({message:'Password must contain at least 8 characters.'});
  if(await User.findOne({email}))return res.status(409).json({message:'An account with this email already exists.'});
  const user=await User.create({email,passwordHash:await bcrypt.hash(password,12)});
  res.status(201).json({token:token(user),email:user.email});
 }catch(e){res.status(400).json({message:'Could not create account.'});}
});
router.post('/login',async(req,res)=>{
 const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
 const user=await User.findOne({email});
 if(!user||!(await bcrypt.compare(password,user.passwordHash)))return res.status(401).json({message:'Email or password is incorrect.'});
 res.json({token:token(user),email:user.email});
});
module.exports=router;
