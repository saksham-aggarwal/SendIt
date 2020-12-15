import React, { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import './Main.css';

import api from '../constants/apiEndPoints'
import status from '../constants/statusCode'
import userType from '../constants/userType'

const header = ["OrderID", "Date Created", "Pick up Location", "Drop off Location", "Status"];

export default function MainPage(props) {
    const [page, setPage] = useState("Profile");

    const changeToOrder = () => {
        setPage("Order")
    }

    const changeToProfile = () => {
        setPage("Profile")
    }

    let content = <></>
    if (page === "Profile") {
        content = <UserProfile user={props.user} handleSetErr={props.handleSetErr} handleSetUser={props.handleSetUser}  handleSetAuth={props.handleSetAuth}/>
    } else if (page === "Order") {
        let url = "";
        if (props.user.type === userType.customer) {
            url = api.base + api.handlers.customer + "/" + props.user.id + api.handlers.order
        } else {
            url = api.base + api.handlers.driver + "/" + api.handlers.available
        }
        content = <OrderPage user={props.user} url={url} auth={props.auth} handleSetErr={props.handleSetErr}/>
    }

    return (
    <div>
        <h2>Main page</h2>
        <div class="container justify-content-center">
            <div class="card p-3">
                <div class="d-flex align-items-center">
                    <div class="ml-3 w-100">
                        <div class="button mt-2 d-flex flex-row align-items-center"> 
                            <button class="btn btn-sm btn-outline-primary w-100" onClick={changeToOrder}>Show Order List</button> 
                        </div>
                        <div class="button mt-2 d-flex flex-row align-items-center"> 
                            <button class="btn btn-sm btn-outline-primary w-100" onClick={changeToProfile}>Show Profile</button> 
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {content}
        {/* <button onClick={changeToOrder}>show order list</button> */}
        {/* <button onClick={changeToProfile}>show user profile</button> */}
    </div>
    );
}

function UserProfile(props) {
    const handleLogOut = async (event) => {
        event.preventDefault();
        const response = await fetch(api.base + api.handlers.login, {
            method: "DELETE",
            headers: new Headers({
                "Authorization": localStorage.getItem("Authorization")
            })
        });
        if (response.status >= 300) {
            const error = await response.text();
            console.log(error)
            props.handleSetErr(error);
        } else {
            localStorage.removeItem("Authorization");
            props.handleSetUser({});
            props.handleSetAuth("");
            props.handleSetErr("");
        }
    }
    return (
        <>
            <div class="container justify-content-center user-profile">
                <div class="card p-3">
                    <div class="d-flex align-items-center">
                        <div class="image"> <img src="https://i.ibb.co/HCrg2Nf/User.png" class="rounded" width="155"/> </div>
                        <div class="ml-3 w-100">
                            <h4 class="mb-0 mt-0">{props.user.firstName} {props.user.lastName}</h4> 
                            <div class="user-info">
                                <h6>UserType: {props.user.type}</h6>
                                <h6>Email: {props.user.email}</h6>
                            </div>
                            <div class="button mt-2 d-flex flex-row align-items-center"> 
                                <button class="btn btn-sm btn-outline-primary w-100" onClick={handleLogOut}>Logout</button> 
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* <h3>user profile</h3>
            <p>user name: {props.user.userName}</p>
            <p>first name: {props.user.firstName}</p>
            <p>last name: {props.user.lastName}</p>
            <p>you are a {props.user.type}</p>
            <button onClick={handleLogOut}>log out</button> */}
        </>
    );
}

function OrderPage(props) {
    const [orderList, setOrderList] = useState([]);
    const [price, setPrice] = useState(0);
    const [range, setRange] = useState(0);
    const [pickUp, setPickUp] = useState("");
    const [dropOff, setDropOff] = useState("");

    useEffect(() => {
        fetch(props.url , {
            method: "GET",
            headers: new Headers({
                "Authorization": props.auth
            })
        }).then(
            response => response.json()
        ).then(
            data => setOrderList(data)
        ).catch(err => props.handleSetErr(err))
    }, [])

    const handlePrice = (event) => {
        setPrice(parseInt(event.target.value));
    }

    const handleRange = (event) => {
        setRange(parseInt(event.target.value));
    }

    const handlePickUp = (event) => {
        setPickUp(event.target.value);
    }

    const handleDropOff = (event) => {
        setDropOff(event.target.value)
    }

    const addOrder = async (event) => {
        event.preventDefault();
        const url = props.url;
        const sendData = {
            price: price,
            range: range,
            pickupLocation: pickUp,
            dropoffLocation: dropOff
        };
        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(sendData),
            headers: new Headers({
                "Content-Type": "application/json",
                "Authorization": props.auth
            })
        });

        if (response.status !== status.created) {
            const err = await response.text();
            props.handleSetErr(err)
        } else {
            setPrice(0);
            setRange(0);
            setPickUp("");
            setDropOff("");
            props.handleSetErr("");
        }
    }

    const updateList = async (event) => {
        event.preventDefault();
        const response = await fetch(props.url , {
            method: "GET",
            headers: new Headers({
                "Authorization": props.auth
            })
        })

        if (response.status !== status.ok) {
            const err = await response.text();
            props.handleSetErr(err)
        } else {
            const newList = await response.json();
            setOrderList(newList)
        }
    }
    
    const orderListHeader = header.map((col) => <th key={col}>{col}</th>)

    const renderOrderList = orderList.map(order => {
        return (
            <tr key={order._id}> 
                <td>{order._id}</td> 
                <td>{order.createdAt}</td>
                <td>{order.pickupLocation}</td>
                <td>{order.dropoffLocation}</td>
                <td>{order.status}</td>
            </tr>
        )
    })

    let specificContent = <></>
    if (props.user.type === userType.customer) {
        specificContent = <AddOrder handlePrice={handlePrice} handleRange={handleRange} handlePickUp={handlePickUp} 
        handleDropOff={handleDropOff} addOrder={addOrder} updateList={updateList}/>
    } else {
        specificContent = <ProcessOrder updateList={updateList} handleSetErr={props.handleSetErr} auth={props.auth}/>
    }

    return (
        <>
        <div class="order-page">
            <h3>Order page</h3>
            <table className='table table-bordered'>
                <thead>
                    {orderListHeader}
                </thead>
                <tbody>
                {renderOrderList}
                </tbody>
            </table>
            {specificContent}
        </div>
        </>
    );
}

function AddOrder(props) {
    return (
        <div>
        <div class="button mt-2 d-flex flex-row align-items-center"> 
            <button class="btn btn-sm btn-outline-primary w-100" onClick={props.updateList}>Update Order List</button> 
        </div>
        <div class="container pt-4 add-order">
        <form>
            <div class='form-group'>
                <label for="firstname">Recipient's First Name</label>
                <input type="first name" class="form-control" aria-label="firstname" placeholder="First"></input>
            </div>
            <div class='form-group'>
                <label for="lastname">Recipient's Last Name</label>
                <input type="last name" class="form-control" aria-label="lastname" placeholder="Last"></input>
            </div>
            <div class='form-group'>
                <label for="pickup">Pick up Location</label>
                <input type="email" class="form-control" aria-label="pickup" placeholder="Enter complete address (street, city, state)" onChange={props.handlePickUp}></input>
            </div>
            <div class='form-group'>
                <label for="drop off">Drop off Location</label>
                <input type="email" class="form-control" aria-label="drop off" placeholder="Enter complete address (street, city, state)" onChange={props.handleDropOff}></input>
            </div>
            <button class="btn btn-primary add-button" onClick={props.addOrder}>Place Order</button>
        </form>
        </div>
        </div>
    );
        // <form>
        //     <input placeholder="price" aria-label="price" onChange={props.handlePrice}></input>
        //     <input placeholder="range" aria-label="range" onChange={props.handleRange}></input>
        //     <input placeholder="pick up location" aria-label="pick up" onChange={props.handlePickUp}/>
        //     <input placeholder="drop off location" aria-label="drop off" onChange={props.handleDropOff}/>
        //     <button onClick={props.addOrder}>add order</button>
        //     <button onClick={props.updateList}>update order list</button>
        // </form>
    // );
}

function ProcessOrder(props) {
    const [orderID, setOrderID] = useState("");
    const [order, setOrder] = useState({});
    const [accepted, setAccepted] = useState(false);

    const handleOrderID = (event) => {
        setOrderID(event.target.value)
    }

    console.log(orderID);

    const handleOrderDetail = async (event) => {
        event.preventDefault();

        const response = await fetch(api.base + api.handlers.driver + api.handlers.accept + "/" + orderID, {
            method: "PATCH",
            headers: new Headers({
                "Authorization": props.auth
            })
        });

        if (response.status !== status.ok) {
            const err = await response.text();
            props.handleSetErr(err);
        } else {
            const orderInfo = response.json();
            setOrder(orderInfo)
            props.handleSetErr("");
            setAccepted(true);
        }
    }

    const completeOrder = async (event) => {
        event.preventDefault();
        const response = await fetch(api.base + api.handlers.driver + api.handlers.complete + "/" + orderID, {
            method: "PATCH",
            headers: new Headers({
                "Authorization": props.auth
            })
        });

        if (response.status !== status.ok) {
            const err = await response.text();
            props.handleSetErr(err);
        } else {
            setAccepted(false);
            props.handleSetErr("");
            props.updateList(event);
        }
    }

    let completeOrderButton = <button onClick={handleOrderDetail}>accept order</button>
    if (accepted) {
        completeOrderButton = <button onClick={completeOrder}>complete order</button>
    }

    return (<>
        <div>
            <form>
                <input aria-label="order id" onChange={handleOrderID}></input>
                {completeOrderButton}
            </form>
            <p>Order info</p>
            <p>{order._id} {order.customerID} {Date(order.createdAt)} {order.driverID} {order.range} {order.price} {order.pickupLocation} {order.dropoffLocation}</p>
        </div>
    </>
    );
}