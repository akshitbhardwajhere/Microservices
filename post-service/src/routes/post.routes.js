const express = require("express");
const {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} = require("../controllers/post.controller");


//Router
const router = express.Router();

//Middleware => This will tell whether the user is authenticated or not.
const { authenticateRequest } = require("../middlewares/auth.middleware");
router.use(authenticateRequest);

router.post("/create-post", authenticateRequest, createPost);
router.get("/get-all-posts", authenticateRequest, getAllPosts);
router.get("/:id", authenticateRequest, getPost);
router.delete("/:id", authenticateRequest, deletePost);



module.exports = router;
