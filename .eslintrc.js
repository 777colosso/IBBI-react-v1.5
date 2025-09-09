module.exports = {
  // ...existing config...
  rules: {
    // Allow inline styles for dynamic values like progress bars
    "react/no-inline-styles": "off",
    // Or more specifically, if you want to be more selective:
    // "react/no-inline-styles": ["warn", { 
    //   "allow": ["width", "transform", "fontSize", "minHeight"] 
    // }]
  },
};