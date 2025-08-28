// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import {Base64} from "./libraries/Base64.sol";
import {IVeArtProxy} from "./interfaces/IVeArtProxy.sol";

contract VeArtProxy is IVeArtProxy {
    constructor() {}

    function toString(uint value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT license
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint temp = value;
        uint digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function decimalString(
        uint256 number,
        uint8 decimals,
        bool isPercent
    ) private pure returns (string memory) {
        uint8 percentBufferOffset = isPercent ? 1 : 0;
        uint256 tenPowDecimals = 10 ** decimals;

        uint256 temp = number;
        uint8 digits;
        uint8 numSigfigs;
        while (temp != 0) {
            if (numSigfigs > 0) {
                // count all digits preceding least significant figure
                numSigfigs++;
            } else if (temp % 10 != 0) {
                numSigfigs++;
            }
            digits++;
            temp /= 10;
        }

        DecimalStringParams memory params;
        params.isPercent = isPercent;
        if ((digits - numSigfigs) >= decimals) {
            // no decimals, ensure we preserve all trailing zeros
            params.sigfigs = number / tenPowDecimals;
            params.sigfigIndex = digits - decimals;
            params.bufferLength = params.sigfigIndex + percentBufferOffset;
        } else {
            // chop all trailing zeros for numbers with decimals
            params.sigfigs = number / (10 ** (digits - numSigfigs));
            if (tenPowDecimals > number) {
                // number is less tahn one
                // in this case, there may be leading zeros after the decimal place
                // that need to be added

                // offset leading zeros by two to account for leading '0.'
                params.zerosStartIndex = 2;
                params.zerosEndIndex = decimals - digits + 2;
                params.sigfigIndex = numSigfigs + params.zerosEndIndex;
                params.bufferLength = params.sigfigIndex + percentBufferOffset;
                params.isLessThanOne = true;
            } else {
                // In this case, there are digits before and
                // after the decimal place
                params.sigfigIndex = numSigfigs + 1;
                params.decimalIndex = digits - decimals + 1;
            }
        }
        params.bufferLength = params.sigfigIndex + percentBufferOffset;
        return generateDecimalString(params);
    }

    struct DecimalStringParams {
        // significant figures of decimal
        uint256 sigfigs;
        // length of decimal string
        uint8 bufferLength;
        // ending index for significant figures (funtion works backwards when copying sigfigs)
        uint8 sigfigIndex;
        // index of decimal place (0 if no decimal)
        uint8 decimalIndex;
        // start index for trailing/leading 0's for very small/large numbers
        uint8 zerosStartIndex;
        // end index for trailing/leading 0's for very small/large numbers
        uint8 zerosEndIndex;
        // true if decimal number is less than one
        bool isLessThanOne;
        // true if string should include "%"
        bool isPercent;
    }

    function generateDecimalString(
        DecimalStringParams memory params
    ) private pure returns (string memory) {
        bytes memory buffer = new bytes(params.bufferLength);
        if (params.isPercent) {
            buffer[buffer.length - 1] = "%";
        }
        if (params.isLessThanOne) {
            buffer[0] = "0";
            buffer[1] = ".";
        }

        // add leading/trailing 0's
        for (
            uint256 zerosCursor = params.zerosStartIndex;
            zerosCursor < params.zerosEndIndex;
            zerosCursor++
        ) {
            buffer[zerosCursor] = bytes1(uint8(48));
        }
        // add sigfigs
        while (params.sigfigs > 0) {
            if (
                params.decimalIndex > 0 &&
                params.sigfigIndex == params.decimalIndex
            ) {
                buffer[--params.sigfigIndex] = ".";
            }
            buffer[--params.sigfigIndex] = bytes1(
                uint8(uint256(48) + (params.sigfigs % 10))
            );
            params.sigfigs /= 10;
        }
        return string(buffer);
    }

    function _tokenURI(
        uint256 _tokenId,
        uint256 _balanceOf,
        uint256 _locked_end,
        uint256 _value
    ) external view returns (string memory output) {
        output = '<svg version="1.2" x="0px" y="0px" viewBox="0 0 1920 1920" overflow="visible" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">';

        string memory logo = '<defs id="defs190"><style id="style182">.st0 {fill: #fff;}.st1 {fill: none;}.st2 {stroke: #000;stroke-miterlimit: 10;}.st3 {clip-path: url(#clippath-1);}.st4 {clip-path: url(#clippath);}</style><clipPath id="clippath"><path class="st1" d="M251.4,73c-7.8-10.1-30-7.3-58.2,5.3v-14l-26.6-26.5v103.8c10.3-8.8,19.3-17.2,26.6-24.9v-27.7c9.3-3.4,16.6-4.4,20.8-2.6,1.1.5,2,1.1,2.7,2,5,6.5-4.7,23.1-23.4,42.9-7.5,7.9-16.5,16.4-26.6,24.8-4,3.4-8.2,6.8-12.6,10.2-.3.2-.6.4-.8.6-9.1,7-18.1,13.3-26.7,18.8-4.6,2.9-9.1,5.7-13.4,8.1-9.9,5.6-19,10-26.6,12.8-11.9,4.3-20.4,4.8-23.6.7-.6-.9-1-1.9-1.2-3.1-1.1-7.9,8.4-22.8,24.8-40v32.8c7.8-3.9,16.8-9.1,26.6-15.4V61.4l-26.8,26.5v66.6c-31.5,32.3-47.6,62.4-37.7,75.3,5.8,7.5,19.5,7.9,37.7,2.5v10.3l26.6,26.1v-47c4.4-2.1,8.9-4.4,13.4-7v83.2l26.7-26.2v-73.3c4.4-3,8.9-6.2,13.4-9.5v69.6l26.6-26.1v-64.9c44.8-38.9,70.2-79.1,58.3-94.5h0Z" id="path184"/></clipPath><clipPath id="clippath-1"><path class="st1" d="M153.1,152.8V2.1l-26.6,26.5v144c6.7-4.7,13.7-9.7,20.7-15.2,2-1.5,4-3.1,5.9-4.6Z" id="path187"/></clipPath></defs><g id="bkg"><rect class="st2" width="1920" height="1920" id="rect192"/></g><g id="Layer_1" transform="matrix(4.1720339,0,0,4.1720339,333.94546,98.265257)"><g id="_x32_"><path class="st0" d="m 251.4,73 c -7.8,-10.1 -30,-7.3 -58.2,5.3 v -14 L 166.6,37.8 v 103.8 c 10.3,-8.8 19.3,-17.2 26.6,-24.9 V 89 c 9.3,-3.4 16.6,-4.4 20.8,-2.6 1.1,0.5 2,1.1 2.7,2 5,6.5 -4.7,23.1 -23.4,42.9 -7.5,7.9 -16.5,16.4 -26.6,24.8 -4,3.4 -8.2,6.8 -12.6,10.2 -0.3,0.2 -0.6,0.4 -0.8,0.6 -9.1,7 -18.1,13.3 -26.7,18.8 -4.6,2.9 -9.1,5.7 -13.4,8.1 -9.9,5.6 -19,10 -26.6,12.8 -11.9,4.3 -20.4,4.8 -23.6,0.7 -0.6,-0.9 -1,-1.9 -1.2,-3.1 -1.1,-7.9 8.4,-22.8 24.8,-40 V 197 c 7.8,-3.9 16.8,-9.1 26.6,-15.4 V 61.4 L 86.4,87.9 v 66.6 c -31.5,32.3 -47.6,62.4 -37.7,75.3 5.8,7.5 19.5,7.9 37.7,2.5 v 10.3 l 26.6,26.1 v -47 c 4.4,-2.1 8.9,-4.4 13.4,-7 v 83.2 l 26.7,-26.2 v -73.3 c 4.4,-3 8.9,-6.2 13.4,-9.5 v 69.6 l 26.6,-26.1 V 167.5 C 237.9,128.6 263.3,88.4 251.4,73 Z" id="path195"/><g class="st4" clip-path="url(#clippath)" id="g199"><polygon class="st0" points="240.1,37.8 38.8,43.1 38.8,37.8 " id="polygon197"/></g></g><g id="_x31_"><g id="g208"><path class="st0" d="M 153.1,152.8 V 2.1 l -26.6,26.5 v 144 c 6.7,-4.7 13.7,-9.7 20.7,-15.2 2,-1.5 4,-3.1 5.9,-4.6 z" id="path202"/><g class="st3" clip-path="url(#clippath-1)" id="g206"><polygon class="st0" points="133.1,172.6 153.1,172.1 153.1,172.6 " id="polygon204"/></g></g></g></g>';

        uint256 duration = 0;
        if (_locked_end > block.timestamp) {
            duration = _locked_end - block.timestamp;
        }

        output = string(
            abi.encodePacked(
                output,
                logo,
                '<text y="1440" x="50%" fill="white" dominant-baseline="middle" text-anchor="middle" class="vr" font-size="85px"> Beam veNFT #',
                decimalString(_tokenId, 0, false),
                '</text> <text font-size="80px" fill="white" y="1560" x="48" dominant-baseline="middle" class="label" > Locked: </text> <text font-size="80px" y="1560" fill="white" x="1870" dominant-baseline="middle" text-anchor="end" class="amount" >',
                decimalString(_value / 1e16, 2, false),
                '</text> <text font-size="80px" fill="white" y="1680" x="48" dominant-baseline="middle" class="label"> Voting Power: </text> <text font-size="80px" fill="white" y="1680" x="1870" dominant-baseline="middle" text-anchor="end" class="amount">',
                decimalString(_balanceOf / 1e16, 2, false),
                '</text> <text font-size="80px"  fill="white" y="1800" x="48" dominant-baseline="middle" class="label" > Expires: </text> <text font-size="80px" fill="white" y="1800" x="1870" dominant-baseline="middle" text-anchor="end" class="amount" >',
                decimalString(duration / 8640, 1, false),
                ' days </text> <text fill="white" y="1858" x="50%" font-size="45px" dominant-baseline="middle" text-anchor="middle" class="app" > https://www.beamdex.xyz/ </text></svg>'
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "lock #',
                        decimalString(_tokenId, 0, false),
                        '", "description": "veNFT locks, can be used to vote on token emissions and receive voting rewards", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '"}'
                    )
                )
            )
        );

        output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );
    }
}

