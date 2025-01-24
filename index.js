const testiables = function () {
  var x = 5;
  {
    x = 10;
    {
      x = 50;
    }
    {
      x = 500;
    }
    x = 5000;
  }
  for (var x = 2; x < 20; x++) {}
  console.log(x);
};

testiables();
