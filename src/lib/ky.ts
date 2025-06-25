import ky from "ky";

const kyInstance = ky.create({
  parseJson: (text) =>
    JSON.parse(text, (key, value) => {
      if (key.endsWith("At")) return new Date(value);
      return value;
    }),
}); // Create a custom ky instance with JSON parsing for date strings 

export default kyInstance;