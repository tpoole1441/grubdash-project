const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

function list(req, res) {
  res.json({ data: orders });
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({
      status: 400,
      message: `Must include a ${propertyName}`,
    });
  };
}

function dishesIsValidArray(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (!Array.isArray(dishes) || dishes.length === 0) {
    next({
      status: 400,
      message: "Order must include at least one dish",
    });
  }
  next();
}

function quantityIsValidNumber(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  for (let i = 0; i < dishes.length; i++) {
    const { quantity } = dishes[i];
    if (!quantity || !Number.isInteger(quantity)) {
      return next({
        status: 400,
        message: `dish ${i} must have a quantity that is an integer greater than 0`,
      });
    }
  }
  next();
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    status: status,
    dishes: dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order id not found: ${orderId}`,
  });
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function orderIdMatches(req, res, next) {
  order = res.locals.order;
  const { data: { id } = {} } = req.body;
  if (id && order.id !== id) {
    next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${order.id}`,
    });
  }
  next();
}

function checkDeliveredStatus(req, res, next) {
  const { data: { status } = {} } = req.body;
  const validStatuses = ["pending", "preparing", "out-for-delivery"];
  if (!validStatuses.includes(status)) {
    return next({
      status: 400,
      message: "Order must have valid status",
    });
  }
  next();
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  res.json({ data: order });
}

function checkPendingStatus(req, res, next) {
  const order = res.locals.order;
  if (order.status !== "pending") {
    next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }
  next();
}

function destroy(req, res) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  const deletedOrders = orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    dishesIsValidArray,
    quantityIsValidNumber,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    orderIdMatches,
    bodyDataHas("status"),
    checkDeliveredStatus,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    dishesIsValidArray,
    quantityIsValidNumber,
    update,
  ],
  delete: [orderExists, checkPendingStatus, destroy],
};
