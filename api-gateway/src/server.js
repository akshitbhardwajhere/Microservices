require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const { errorHandler } = require("../src/middlewares/errorHandler");
const { validateToken } = require("../src/middlewares/auth.middleware");

const app = express();

const redisClient = new Redis(process.env.REDIS_URL);

//Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Rate Limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive Endpoint rate limit exceeded for the IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(rateLimiter);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err,
    });
  },
};

//Setting up proxy for User Service
app.use(
  "/v1/auth",
  proxy(process.env.USER_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from User Service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);

//Setting up proxy for Post Service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Post Service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);

//Setting up proxy for Media Service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      if (srcReq.headers["Content-Type"] && srcReq.headers["Content-Type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = srcReq.headers["Content-Type"];
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media Service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
    parseReqBody: false,
  })
);

//Setting up proxy for Search Service
app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Search Service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);

//Error Handler
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  logger.info(
    `API Gateway is running on http://localhost:${process.env.PORT}`
  );
  logger.info(
    `User Service is running on ${process.env.USER_SERVICE_URL}`
  );
  logger.info(
    `Post Service is running on ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `Media Service is running on ${process.env.MEDIA_SERVICE_URL}`
  );
  logger.info(
    `Search Service is running on ${process.env.SEARCH_SERVICE_URL}`
  );
  logger.info(`Redis is running on ${process.env.REDIS_URL}`);
});
