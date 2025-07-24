// data_base.js
import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const userSchema = new Schema({
    email: String,
    password: String,
    username: String
});

const submittedFormsSchema = new Schema({
    Title: String,
    company: String,
    userId: Types.ObjectId
});

const internshalaUserSchema = new Schema({
    internshalla_email: String,
    internshalla_password: String,
    userId: Types.ObjectId
});

const User_Model = mongoose.model('users', userSchema);
const Submitted_forms_Model = mongoose.model('Submitted_forms', submittedFormsSchema);
const Internshala_user_Model = mongoose.model('internshalla_user', internshalaUserSchema);


export {
    User_Model,
    Submitted_forms_Model,
    Internshala_user_Model
};
