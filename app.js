const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json()); // Modify incoming data

const toursPath = `${__dirname}/dev-data/data/tours-simple.json`;
const tours = JSON.parse(fs.readFileSync(toursPath, 'utf-8'));

const getAllTours = (req, res) => {
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
};

const getTour = (req, res) => {
  const id = parseInt(req.params.id);
  const tour = tours.find((el) => el.id === id);

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Tour not found. Invalid ID',
    });
  }
  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
};

const createTour = (req, res) => {
  const newId = tours.length;
  const newTour = Object.assign({ id: newId }, req.body);

  tours.push(newTour);

  fs.writeFile(toursPath, JSON.stringify(tours), (err) => {
    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  });
};

const updateTour = (req, res) => {
  const id = parseInt(req.params.id);
  const tour = tours.find((el) => el.id === id);

  // TODO: tour modification

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Tour not found. Invalid ID',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
};

const deleteTour = (req, res) => {
  const id = parseInt(req.params.id);
  const tour = tours.find((el) => el.id !== id);
  const newTours = tours.filter((el) => el.id !== id);

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Tour not found. Invalid ID',
    });
  }

  fs.writeFile(toursPath, JSON.stringify(newTours), (err) => {
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
};

app.route('/api/v1/tours').get(getAllTours).post(createTour);
app
  .route('/api/v1/tours/:id')
  .get(getTour)
  .patch(updateTour)
  .delete(deleteTour);

const port = 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
