const mongoose = require('mongoose');

//All the errors that occur in the synchronus code are called as uncaught exceptions
//Here like the uncaught exception is the last line in this file which is commented console.log(x) where x is not defined
process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION ! SHUTTING DOWN');
  //Whenever there is a uncaught exception then we want to close the applicaiton abruptyly
  process.exit(1);
});
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//Connecting our express application to hosted mongodb database through mongoose
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(function() {
    console.log('MONGODB CONNECTION SETUP');
  }) //Though here in the above line we are using catch to catch the rejected promise but then also it is recommended to use both this catch as well process.on("unhandledRejection") event handler
  .catch(err => console.log(err));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log('Server Started');
});
//There might be some unhandled rejection in our application that might be not from your exprss app but from external sources like mongoDb
//Whenerver there is a unhandled rejection then process always emits unhandledRejection and then we can listen to this event
//So basically we can handle all the unhandled rejections at one place
process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION ! SHUTTING DOWN');
  //We can directly use process.exit() to shut down our app but it is a more abrupt way
  //We can close the server by using server.close in a more smooth way
  // The server. close() method stops the HTTP server from accepting new connections. All existing connections are kept.
  //so basically the ongoing requests will be handled by the new request will not be handled
  //hence the our app will be stopped after handling the ongoing requests
  server.close(() => {
    //process.exit will stop our express app
    // Exit Failure is indicated by exit(1) which means the abnormal termination of the program, i.e. some error or interrupt has occurred.
    process.exit(1);
  });
});

// console.log(x);
