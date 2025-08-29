// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0;

import {Base64} from "./libraries/Base64.sol";
import {IVeArtProxy} from "./interfaces/IVeArtProxy.sol";

contract VeArtProxy is IVeArtProxy {
    string public veSymbol;
    string public logo;
    string public footer;

    constructor(string memory _veSymbol, string memory _logo, string memory _footer) {
        veSymbol = _veSymbol;
        logo = _logo;
        footer = _footer;
    }

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

        uint256 duration = 0;
        if (_locked_end > block.timestamp) {
            duration = _locked_end - block.timestamp;
        }

        output = string(
            abi.encodePacked(
                output,
                logo,
                '<text y="1440" x="50%" fill="white" dominant-baseline="middle" text-anchor="middle" class="vr" font-size="85px"> ',
                veSymbol,
                ' #',
                decimalString(_tokenId, 0, false),
                '</text> <text font-size="80px" fill="white" y="1560" x="48" dominant-baseline="middle" class="label" > Locked: </text> <text font-size="80px" y="1560" fill="white" x="1870" dominant-baseline="middle" text-anchor="end" class="amount" >',
                decimalString(_value / 1e16, 2, false),
                '</text> <text font-size="80px" fill="white" y="1680" x="48" dominant-baseline="middle" class="label"> Voting Power: </text> <text font-size="80px" fill="white" y="1680" x="1870" dominant-baseline="middle" text-anchor="end" class="amount">',
                decimalString(_balanceOf / 1e16, 2, false),
                '</text> <text font-size="80px"  fill="white" y="1800" x="48" dominant-baseline="middle" class="label" > Expires: </text> <text font-size="80px" fill="white" y="1800" x="1870" dominant-baseline="middle" text-anchor="end" class="amount" >',
                decimalString(duration / 8640, 1, false),
                ' days </text> <text fill="white" y="1858" x="50%" font-size="45px" dominant-baseline="middle" text-anchor="middle" class="app" > ',
                footer,
                ' </text></svg>'
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "lock #',
                        decimalString(_tokenId, 0, false),
                        '", "description": "',
                        veSymbol,
                        ' locks, can be used to vote on token emissions and receive voting rewards", "image": "data:image/svg+xml;base64,',
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

