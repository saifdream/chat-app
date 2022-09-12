import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {useDispatch, useSelector} from "react-redux";
import InfiniteScroll from "react-infinite-scroll-component";
import 'react-perfect-scrollbar/dist/css/styles.css';
import PerfectScrollbar from "react-perfect-scrollbar";
import Message from "./Message";
import {messagesApi} from "../../../features/messages/messagesApi";

export default function Messages({messages = [], totalCount}) {
    const {user} = useSelector((state) => state.auth) || {};
    const {id} = useParams();
    const {email} = user || {};
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const dispatch = useDispatch();

    const fetchMore = () => {
        setPage((prevPage) => prevPage + 1);
    };

    console.log(totalCount , +process.env.REACT_APP_MESSAGES_PER_PAGE, page)
    console.log(Math.ceil( totalCount / +process.env.REACT_APP_MESSAGES_PER_PAGE) > page)

    useEffect(() => {
        if (page > 1) {
            dispatch(
                messagesApi.endpoints.getMoreMessages.initiate({
                    id,
                    page,
                })
            );
        }
    }, [page, id, dispatch]);

    useEffect(() => {
        if (totalCount > 0) {
            const more = Math.ceil( totalCount / +process.env.REACT_APP_MESSAGES_PER_PAGE) > page;
            setHasMore(more);
        }
    }, [totalCount, page]);

    return (
        <PerfectScrollbar>
            <div className="relative w-full h-[calc(100vh_-_197px)] p-6 overflow-y-auto flex flex-col-reverse"
                 id="scrollableDiv">
                <ul className="relative">
                    <InfiniteScroll
                        dataLength={totalCount}
                        next={fetchMore}
                        hasMore={hasMore}
                        loader={
                            <p className="top-0 absolute text-center w-full px-5 py-2">
                                <strong className="px-5 py-2" style={{backgroundColor: 'aliceblue'}}>Loading...</strong>
                            </p>
                        }
                        // height={window.innerHeight - 197}
                        // inverse={true}
                        scrollableTarget="scrollableDiv"
                        endMessage={
                            <p className="top-0 absolute mx-5 my-2 w-full" style={{textAlign: 'center'}}>
                                <strong>Yay! You have seen it all</strong>
                            </p>
                        }
                    >
                        {
                            messages
                            .slice()
                            .sort((a, b) => a.timestamp - b.timestamp)
                            .map((message) => {
                                const {
                                    message: lastMessage,
                                    id,
                                    sender,
                                } = message || {};

                                const justify =
                                    sender.email !== email ? "start" : "end";

                                return (
                                    <Message
                                        key={id}
                                        justify={justify}
                                        message={lastMessage}
                                    />
                                );
                            })
                        }
                    </InfiniteScroll>
                </ul>
            </div>
        </PerfectScrollbar>
    );
}
