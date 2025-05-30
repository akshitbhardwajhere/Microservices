const mongoose = require("mongoose");
const argon2 = require("argon2");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minLength: [6, 'Password must be 6 characters long']
  },
}, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    if(this.isModified('password')) {
        try {
            this.password = await argon2.hash(this.password);
            next();
        } catch (error) {
            return next(error);
        }
    } else {
        next();
    }
});

userSchema.methods.comparePassword = async function(password) {
    try {
        return await argon2.verify(this.password, password);
    } catch (error) {
        throw error
    }
}

userSchema.index({username: 'text'});

const User = mongoose.model('User', userSchema);
module.exports = User;
