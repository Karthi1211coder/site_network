import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import db from "./db.js";
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, generateRefreshToken } from "./auth.js";

const app = express();
const PORT = 4000;

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use(cors());
app.use(express.json());

// REST endpoint for token refresh
app.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.status(403).json({ error: "Invalid or expired refresh token" });

  const user = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(payload.id);
  if (!user) return res.status(403).json({ error: "User not found" });

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  res.json({ accessToken, refreshToken: newRefreshToken });
});

app.use("/graphql", expressMiddleware(server, {
  context: async ({ req }) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = token ? verifyAccessToken(token) : null;
    return { db, user };
  },
}));

app.listen(PORT, () => {
  console.log(`Server ready at http://localhost:${PORT}/graphql`);
});
