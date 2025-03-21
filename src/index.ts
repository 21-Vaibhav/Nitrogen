import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { PrismaClient } from "@prisma/client";
import { customerRoutes } from "./routes/customers.js";
import { restaurantRoutes } from "./routes/restaurants.js";
import { menuItemRoutes } from "./routes/menuItems.js";
import { orderRoutes } from "./routes/orders.js";
import { reportRoutes } from "./routes/reports.js";

// Initialize Prisma client
export const prisma = new PrismaClient();

// Create Hono app
const app = new Hono();

// Register routes
app.route("/customers", customerRoutes);
app.route("/restaurants", restaurantRoutes);
app.route("/menu", menuItemRoutes);
app.route("/orders", orderRoutes);
app.route("/", reportRoutes);

// Home route
app.get("/", (c) => {
  return c.json({ message: "Welcome to Food Ordering API" });
});

// Start server
const PORT = process.env.PORT || 3000;
console.log(`Server is running on port ${PORT}`);

serve({
  fetch: app.fetch,
  port: Number(PORT),
});
