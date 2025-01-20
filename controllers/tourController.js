const fs = require('fs');

const toursPath = `${__dirname}/../dev-data/data/tours-simple.json`;
const tours = JSON.parse(fs.readFileSync(toursPath, 'utf-8'));

exports.checkId = (req, res, next, val) => {
  console.log(`Tour id is: ${val}`);
  const tour = tours.find((el) => el.id === parseInt(val));

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Tour not found. Invalid ID',
    });
  }
  next();
};

exports.getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    results: tours.length,
    requestedAt: req.requestTime,
    data: {
      tours,
    },
  });
};

exports.getTour = (req, res) => {
  const id = parseInt(req.params.id);
  const tour = tours.find((el) => el.id === id);

  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: {
      tour,
    },
  });
};

exports.createTour = (req, res) => {
  const newId = tours.length;
  const newTour = Object.assign({ id: newId }, req.body);

  tours.push(newTour);

  fs.writeFile(toursPath, JSON.stringify(tours), (err) => {
    res.status(201).json({
      status: 'success',
      requestedAt: req.requestTime,
      data: {
        tour: newTour,
      },
    });
  });
};

exports.updateTour = (req, res) => {
  const id = parseInt(req.params.id);
  const tour = tours.find((el) => el.id === id);

  // TODO: tour modification

  res.status(200).json({
    status: 'success',
    requestedAt: req.requestTime,
    data: {
      tour,
    },
  });
};

exports.deleteTour = (req, res) => {
  const id = parseInt(req.params.id);
  const newTours = tours.filter((el) => el.id !== id);

  fs.writeFile(toursPath, JSON.stringify(newTours), (err) => {
    res.status(204).json({
      status: 'success',
      requestedAt: req.requestTime,
      data: null,
    });
  });
};
