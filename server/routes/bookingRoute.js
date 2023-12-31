const express = require("express");
const moment = require("moment");

const { v4: uuidv4 } = require("uuid"); //https://www.npmjs.com/package/uuid
const Razorpay = require("razorpay");

const Booking = require("../models/booking");
const Room = require("../models/room");
const crypto = require("crypto");
// const { instance } = require("../server");

const router = express.Router();
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

router.post("/getallbookings", async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.send(bookings);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error });
  }
});

router.post("/cancelbooking", async (req, res) => {
  const { bookingid, roomid } = req.body;
  try {
    const booking = await Booking.findOne({ _id: bookingid });

    booking.status = "cancelled";
    await booking.save();
    const room = await Room.findOne({ _id: roomid });
    const bookings = room.currentbookings;
    const temp = bookings.filter((x) => x.bookingid.toString() !== bookingid);
    room.currentbookings = temp;
    await room.save();

    res.send("Your booking cancelled successfully");
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error });
  }
});

router.post("/getbookingbyuserid", async (req, res) => {
  const { userid } = req.body;
  try {
    const bookings = await Booking.find({ userid: userid });

    res.send(bookings);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error });
  }
});

router.post("/bookroom", async (req, res) => {
  // console.log("first");
  const { room, userid, fromdate, todate, totalAmount, totaldays, token } =
    req.body;
  const options = {
    amount: Number(totalAmount * 10),
    currency: "INR",
  };
  //console.log(req.body);

  try {
    const order = await instance.orders.create(options);
    // console.log("first");
    // console.log(order);
    const newBooking = new Booking({
      room: room.name,
      roomid: room._id,
      userid,
      fromdate: moment(fromdate).format("DD-MM-YYYY"),
      todate: moment(todate).format("DD-MM-YYYY"),
      totalamount: totalAmount,
      totaldays,
      transactionid: uuidv4(),
    });

    const booking = await newBooking.save();

    // Update the room's current bookings
    const roomTmp = await Room.findOne({ _id: room._id });
    roomTmp.currentbookings.push({
      bookingid: booking._id,
      fromdate: moment(fromdate).format("DD-MM-YYYY"),
      todate: moment(todate).format("DD-MM-YYYY"),
      userid: userid,
      status: booking.status,
    });

    await roomTmp.save();

    res
      .status(200)
      .json({ message: "Payment Successful, Your Room is booked", order });
  } catch (error) {
    res.status(400).json(error);
  }
});
module.exports = router;
