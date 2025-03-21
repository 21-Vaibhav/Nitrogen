import { Hono } from "hono";
import { prisma } from "../index.js";

export const orderRoutes = new Hono();

// Place an order
orderRoutes.post("/", async (c) => {
  try {
    const { customerId, restaurantId, items }: { customerId: number; restaurantId: number; items: { menuItemId: number; quantity: number }[] } = await c.req.json();

    // Basic validation
    if (!customerId || !restaurantId || !items || !items.length) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Check if customer and restaurant exist
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }

    if (!restaurant) {
      return c.json({ error: "Restaurant not found" }, 404);
    }

    // Get menu items and calculate total price
    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId,
      },
    });

    // Check if all menu items exist and belong to the restaurant
    if (menuItems.length !== menuItemIds.length) {
      return c.json(
        {
          error:
            "One or more menu items not found or don't belong to the restaurant",
        },
        400
      );
    }

    // Create a map of menu item IDs to their prices
    const menuItemPrices: { [key: number]: number } = {};
    menuItems.forEach((item: { id: number; price: number }) => {
      menuItemPrices[item.id] = item.price;
    });

    // Calculate total price
    let totalPrice = 0;
    items.forEach((item) => {
      totalPrice += menuItemPrices[item.menuItemId] * item.quantity;
    });

    // Create order
    const order = await prisma.order.create({
      data: {
        customerId,
        restaurantId,
        totalPrice,
        orderItems: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    return c.json({ data: order }, 201);
  } catch (error) {
    console.error("Error creating order:", error);
    return c.json({ error: "Failed to create order" }, 500);
  }
});

// Retrieve details of a specific order
orderRoutes.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        restaurant: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json({ data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return c.json({ error: "Failed to fetch order" }, 500);
  }
});

// Update the status of an order
orderRoutes.patch("/:id/status", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { status } = await c.req.json();

    // Basic validation
    if (!status) {
      return c.json({ error: "Status is required" }, 400);
    }

    // Check if status is valid
    const validStatuses = ["Placed", "Preparing", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return c.json({ error: "Order not found" }, 404);
    }

    // Update order status
    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });

    return c.json({ data: order });
  } catch (error) {
    console.error("Error updating order status:", error);
    return c.json({ error: "Failed to update order status" }, 500);
  }
});
