const IntercityPackage = require('../models/IntercityPackage');

function intercitySocket(io) {
  io.on('connection', (socket) => {

    /**
     * LIVE PACKAGE REQUEST (CUSTOMER SIDE)
     */
    socket.on('intercity:packages:fetch', async (filters, cb) => {
      try {
        const query = { isActive: true };

        if (filters?.fromCity) query.fromCity = filters.fromCity;
        if (filters?.toCity) query.toCity = filters.toCity;

        const data = await IntercityPackage.find(query).limit(20);

        socket.emit('intercity:packages:data', data);
        cb?.(data);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * REAL-TIME PACKAGE UPDATE (ADMIN BROADCAST HANDLED IN CONTROLLER)
     */
  });
}

module.exports = intercitySocket;