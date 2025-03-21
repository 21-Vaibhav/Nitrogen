import { Hono } from "hono";
import { prisma } from "../index.js";

export const menuItemRoutes = new Hono();

// Update availability or price of a menu item
menuItemRoutes.patch("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { price, isAvailable } = await c.req.json();

    // Check if at least one field to update is provided
    if (price === undefined && isAvailable === undefined) {
      return c.json({ error: "No fields to update provided" }, 400);
    }

    // Check if menu item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return c.json({ error: "Menu item not found" }, 404);
    }

    // Update the menu item
    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(price !== undefined && { price }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });

    return c.json({ data: menuItem });
  } catch (error) {
    console.error("Error updating menu item:", error);
    return c.json({ error: "Failed to update menu item" }, 500);
  }
});

// Retrieve the most ordered menu item across all restaurants
menuItemRoutes.get("/top-items", async (c) => {
  try {
    // This is more complex with Prisma - we need to do a few queries
    const orderItems = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    // Get the details of these menu items
    const topMenuItems = await Promise.all(
      orderItems.map(async (item: { menuItemId: number; _sum: { quantity: number | null } }) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          include: { restaurant: true },
        });

        if (!menuItem) {
          throw new Error(`Menu item with ID ${item.menuItemId} not found`);
        }

        return {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          restaurant: menuItem.restaurant.name,
          totalOrdered: item._sum.quantity ?? 0, // Default to 0 if quantity is null
        };
      })
    );

    return c.json({ data: topMenuItems });
  } catch (error) {
    console.error("Error fetching top menu items:", error);
    return c.json({ error: "Failed to fetch top menu items" }, 500);
  }
});
