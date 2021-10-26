//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../CoreRef.sol";

/// @title StkEth Contract
/// @author Ankit Parashar
contract StkEth is IStkEth, ERC20, CoreRef {

    // solhint-disable-next-line var-name-mixedcase
    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    mapping(address => uint256) public nonces;


    constructor (address _core) public 
        CoreRef(_core)
        ERC20("Staked Eth", "stkEth") 
    {
        uint256 chainId;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name())),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );        

    }

    function mint(address to, uint256 amount) public override virtual onlyMinter {
        _mint(to, amount);
    }

    /// @notice permit spending of Artha
    /// @param owner the stkEth holder
    /// @param spender the approved operator
    /// @param value the amount approved
    /// @param deadline the deadline after which the approval is no longer valid
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // solhint-disable-next-line not-rely-on-time
        require(deadline >= block.timestamp, "stkEth: EXPIRED");
        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            PERMIT_TYPEHASH,
                            owner,
                            spender,
                            value,
                            nonces[owner]++,
                            deadline
                        )
                    )
                )
            );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(
            recoveredAddress != address(0) && recoveredAddress == owner,
            "stkEth: INVALID_SIGNATURE"
        );
        _approve(owner, spender, value);
    }    

    function pricePerShare() public view override returns (uint256) {
        // Todo
        return 0;
    }

    function burn(address user, uint256 amount) external override {
        // Todo
    }
}
