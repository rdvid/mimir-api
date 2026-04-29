import mongoose, { Schema } from 'mongoose';

interface DeletedUser {
    username: string;
    name: string;
    email: string;
    avatar: string;
    currentPocketMoney: string;
}

const deletedUserSchema = new Schema<DeletedUser>(
    {
        username: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
        },
        avatar: {
            type: String,
            required: true,
        },
        currentPocketMoney: {
            type: String,
            default: '0',
        },
    },
    {
        timestamps: true,
    },
);

const DeletedUserModel = mongoose.model('deletedUser', deletedUserSchema);
export default DeletedUserModel;
