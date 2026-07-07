const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const tokenService = require('../services/token.service');
const { Customer, User, Admin } = require('../models');

async function createGraphQLServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  return server;
}

function graphQLMiddleware(server) {
  return expressMiddleware(server, {
    context: async ({ req }) => {
      const header = req.headers.authorization;
      let user = null;
      if (header?.startsWith('Bearer ')) {
        try {
          const decoded = tokenService.verifyAccessToken(header.slice(7));
          if (decoded.accountType === 'customer' || decoded.role === 'customer') {
            user = await Customer.findById(decoded.sub).lean();
            if (user) user.role = 'customer';
          } else if (decoded.accountType === 'rider' || decoded.role === 'driver') {
            user = await User.findById(decoded.sub).lean();
            if (user) user.role = 'driver';
          } else if (decoded.role === 'admin') {
            user = await Admin.findById(decoded.sub).lean();
            if (user) user.role = 'admin';
          }
        } catch {
          user = null;
        }
      }
      return { req, user };
    },
  });
}

module.exports = { createGraphQLServer, graphQLMiddleware };
