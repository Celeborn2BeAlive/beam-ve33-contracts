import fs from "node:fs"

export const getBeamLogo = () => {
  const beamLogoPath = `${__dirname}/assets/beam_logo.svg`;
  const svgString = fs.readFileSync(beamLogoPath, { encoding:"utf-8" });
  return svgString.split('<svg version="1.2" x="0px" y="0px" viewBox="0 0 1920 1920" overflow="visible" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">')[1].split("</svg>")[0];
}
