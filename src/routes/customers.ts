import { Hono } from "hono";
import { prisma } from "../index.js";

export const customerRoutes = new Hono();

customerRoutes.post("/", async (c) => {
  try {
    const { name, email, phoneNumber, address } = await c.req.json();

    if (!name || !email || !phoneNumber || !address) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phoneNumber,
        address,
      },
    });

    return c.json({ data: customer }, 201);
  } catch (error) {
    console.error("Error creating customer:", error);
    return c.json({ error: "Failed to create customer" }, 500);
  }
});

customerRoutes.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return c.json({ error: "Customer not found" }, 404);
    }

    return c.json({ data: customer });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return c.json({ error: "Failed to fetch customer" }, 500);
  }
});

customerRoutes.get("/:id/orders", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const orders = await prisma.order.findMany({
      where: { customerId: id },
      include: {
        restaurant: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return c.json({ data: orders });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return c.json({ error: "Failed to fetch customer orders" }, 500);
  }
});

customerRoutes.get("/top", async (c) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: {
        orders: {
          _count: "desc",
        },
      },
      take: 5,
    });

    return c.json({
      data: customers.map((customer: { id: number; name: string; email: string; _count: { orders: number } }) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        orderCount: customer._count.orders,
      })),
    });
  } catch (error) {
    console.error("Error fetching top customers:", error);
    return c.json({ error: "Failed to fetch top customers" }, 500);
  }
});
