const router=require('express').Router(),Transaction=require('../models/Transaction');
const validDate=s=>/^\\d{4}-\\d{2}-\\d{2}$/.test(s||'');
router.get('/',async(req,res)=>{try{
 const q={user:req.userId};
 if(['income','expense'].includes(req.query.type))q.type=req.query.type;
 if(req.query.category)q.category=req.query.category;
 if(validDate(req.query.from)||validDate(req.query.to)){q.date={};if(validDate(req.query.from))q.date.$gte=new Date(req.query.from+'T00:00:00');if(validDate(req.query.to)){const d=new Date(req.query.to+'T00:00:00');d.setDate(d.getDate()+1);q.date.$lt=d;}}
 res.json(await Transaction.find(q).sort({date:-1,createdAt:-1}));
 }catch(e){res.status(500).json({message:'Could not load transactions.'});}});
router.post('/',async(req,res)=>{try{const row=await Transaction.create({...req.body,user:req.userId});res.status(201).json(row);}catch(e){res.status(400).json({message:e.message||'Invalid transaction.'});}});
router.put('/:id',async(req,res)=>{try{const row=await Transaction.findOneAndUpdate({_id:req.params.id,user:req.userId},{$set:{title:req.body.title,amount:req.body.amount,type:req.body.type,category:req.body.category,date:req.body.date,paymentMethod:req.body.paymentMethod,notes:req.body.notes}},{new:true,runValidators:true});if(!row)return res.status(404).json({message:'Transaction not found.'});res.json(row);}catch(e){res.status(400).json({message:e.message||'Could not update transaction.'});}});
router.delete('/:id',async(req,res)=>{const row=await Transaction.findOneAndDelete({_id:req.params.id,user:req.userId});if(!row)return res.status(404).json({message:'Transaction not found.'});res.json({message:'Transaction deleted.'});});
module.exports=router;
