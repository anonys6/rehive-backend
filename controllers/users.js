import Profile from '../models/Profile.js' ;
import Publication from '../models/publication.js';
import mongoose from 'mongoose';


export const getUser = async (req, res) => {
    try {
        let username = req.params.username;
        let user = await Profile.findOne({ username: username });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        } else {
            let publications = await Publication.find({ author: user._id });
            return res.status(200).json({
                message: "User found",
                profile: {
                    user : {
                        id: user._id,
                        username: user.username,
                        fullName: user.fullName,
                        email: user.email,
                        created: user.createdAt,
                        updated: user.updatedAt,
                        avatar: `http://localhost:3000/avatar/${user.avatar}`,
                        followers: user.followers,
                        following: user.following,
                    },
                    publication: publications.map(publication => ({
                        id: publication._id,
                        image: publication.image ? `http://localhost:3000/image/${publication.image}` : undefined,
                        description: publication.description,
                        date_create : publication.createdAt,
                        date_update : publication.updatedAt,
                        likesUser : publication.likesUser,
                        likes : publication.likes,
                        author: {
                            id: user._id,
                            username: user.username,
                            avatar: `http://localhost:3000/avatar/${user.avatar}`,
                        },
                    }))
                }
            });
        }
    } catch (e) {
        return res.status(500).json({
            message: e.message
        });
    }
}


export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const avatar = req?.file?.filename;
        const { username, email, fullName } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                message : "User not found"
            })
        }

        const data = avatar ? { username, email, avatar } : { username, email, fullName };
        const updatedUser = await Profile.findByIdAndUpdate(id, data, { new: true, runValidators: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'Failed to update profile' });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            profile: {
                username: updatedUser.username,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                updatedAt: updatedUser.updatedAt,
                avatar: `http://localhost:3000/avatar/${updatedUser.avatar}`,
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export const favoritePost = async (req, res) => {
    const { postID } = req.query;
    const { userId } = req.profile;
    const user = await Profile.findById(userId);
    const publication = await Publication.findById(postID);
    if (!user || !publication) {
        return res.status(404).json({
            message: "User or publication not found",
        });
    }
    const isAlreadySaved = user.saved.some((savedPostID) => savedPostID.toString() === postID);
    let message = "";
    if (isAlreadySaved) {
        user.saved = user.saved.filter((savedPostID) => savedPostID.toString() !== postID);
        message = "Publication removed from saved";
    } else {
        user.saved.push(postID);
        message = "Saved successfully";
    }
        await user.save();
        await publication.save();

    return res.status(200).json({
        message: message,
        data: user.saved,
    });
};


export const getFavorite = async (req, res) => {
    try {
        const { userId } = req.profile;
        const user = await Profile.findById(userId).populate({
            path: "saved",
            populate: {
                path: "author",
                select: "username fullName avatar"
            }
        }).lean().sort({ createdAt: -1 });

        if (!user) {
            return res.status(404).json({ message: "User or publication not found" });
        }

        return res.status(200).json({
            favorite: user.saved.reverse().map((post) => ({
                id: post._id,
                description: post.description,
                image: post.image ? `http://localhost:3000/image/${post.image}` : undefined,
                date_create: post.createdAt,
                date_update: post.updatedAt,
                author: {
                    id: post.author._id,
                    username: post.author.username,
                    fullName: post.author.fullName,
                    avatar: post.author.avatar ? `http://localhost:3000/avatar/${post.author.avatar}` : undefined,
                }
            }))
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};



export const follow = async (req, res) => {
    const { userId } = req.profile;
    const { id } = req.params;
    try {
        const user = await Profile.findById(id);
        if (!user) {
            return res.status(404).json({
            message: "User not found",
            });
        }
        user.followers.addToSet(userId);
        await user.save();
        const profile = await Profile.findById(userId);
        profile.following.addToSet(id);
        await profile.save();
        res.json({
            message: "Followed user successfully"
        });
    } catch (err) {
        res.status(500).send(err);
    }
}

export const unFollow = async (req, res) => {
    const { userId } = req.profile;
    const { id } = req.params;
    try {
        const user = await Profile.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.followers.pull(userId);
        await user.save();
        const profile = await Profile.findById(userId);
        profile.following.pull(id);
        await profile.save();
        return res.json({ message: 'Unfollowed user successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).send(err);
        }
};

export const getPeople = async (req, res) => {
    const { userId } = req.profile;
    try {
        const user = await Profile.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const followingIds = user.following.map((follower) => follower._id);
        followingIds.push(userId)
        // console.log(followingIds)
        const people = await Profile.find({ _id: { $nin: followingIds } }, 'username avatar');
        return  res.json({
            people : people.map((person) => {
                return {
                    id : person.id,
                    username : person.username,
                    fullName: person.fullName,
                    avatar : `http://localhost:3000/avatar/${person.avatar}`,
                }
            })
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
};



