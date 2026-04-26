import { app } from "./app.js";

<<<<<<< HEAD
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
=======
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
>>>>>>> fc0350a14070e56e83fc19a84849016e7c3cea96
