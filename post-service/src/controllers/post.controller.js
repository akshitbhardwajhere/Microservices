const logger = require("../utils/logger");
const Post = require("../models/Post");
const { validateCreatePost } = require("../utils/Validation");
const { publishEvent } = require("../utils/rabbitMQ");

const invalidatePostCache = async (req, input) => {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
};

const createPost = async (req, res) => {
  logger.info(`Create post endpoint hit...`);
  try {
    //Validate the Schema
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Post validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIDs } = req.body;
    const newPost = new Post({
      user: req.user.userId,
      content,
      mediaIDs: mediaIDs || [],
    });

    await newPost.save();
    
    await publishEvent('post.created', {
      postId: newPost._id.toString(),
      userId: newPost.user.toString(),
      content: newPost.content,
      createdAt: newPost.createdAt
    })

    await invalidatePostCache(req, newPost._id.toString());

    logger.info("Post created successfully");
    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
      error: error.message,
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info(`Get all posts endpoint hit...`);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      logger.warn("Retrieved posts from cache");
      return res.json({
        success: true,
        data: JSON.parse(cachedPosts),
      });
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    const result = {
      success: true,
      data: {
        posts,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts: totalPosts,
      },
    };

    //Save posts in Redis cache
    // This line uses Redis to cache the posts data:
    // 1. req.redisClient - accesses the Redis client instance attached to the request
    // 2. setex() - Redis command that sets a key with an expiration time
    // 3. cacheKey - unique identifier for this cached data (posts:page:limit)
    // 4. 300 - expiration time in seconds (5 minutes)
    // 5. JSON.stringify(result.data) - converts the posts data object to a JSON string for storage
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result.data));
    logger.info(`Posts retreived`);
    res.json(result);
  } catch (error) {
    logger.error("Error fetching posts", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
      error: error.message,
    });
  }
};

const getPost = async (req, res) => {
  logger.info(`Get a post endpoint hit...`);
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      logger.warn(`Retrieved cached post`);
      return res.json({
        success: true,
        data: JSON.parse(cachedPost),
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      logger.error(`No such post found!`);
      return res.status(404).json({
        success: false,
        message: "No such post found!",
      });
    }

    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(post));
    logger.info(`Post found!`);
    res.json(post);
  } catch (error) {
    logger.error("Error fetching post by ID", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post by ID",
      error: error.message,
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      logger.error(`No such post found!`);
      return res.status(404).json({
        success: false,
        message: "No such post found!",
      });
    }

    //Publish post delete method
    await publishEvent('post.deleted', {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIDs: post.mediaIDs
    })

    await invalidatePostCache(req, req.params.id);
    logger.info("Post deleted successfully!");
    res.json({
      success: true,
      message: "Post deleted successfully!",
    });
  } catch (error) {
    logger.error("Error deleting post", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
      error: error.message,
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
};
