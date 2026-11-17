const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 title:{type:String,required:true,trim:true,maxlength:100},
 amount:{type:Number,required:true,min:0.01},
 type:{type:String,enum:['income','expense'],required:true},
 category:{type:String,required:true,trim:true,maxlength:50},
 date:{type:Date,required:true},
 paymentMethod:{type:String,enum:['Cash','Mobile Money','Bank','Card','Other'],default:'Cash'},
 notes:{type:String,trim:true,maxlength:500}
},{timestamps:true});
schema.index({user:1,date:-1});
module.exports=mongoose.model('Transaction',schema);
