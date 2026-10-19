import next from "eslint-config-next";
export default [...next, { ignores: [".next/**"] }, { rules: { "react/no-unescaped-entities": "off" } }];
