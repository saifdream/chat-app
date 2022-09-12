// import Blank from "./Blank";
import { useParams } from "react-router-dom";
import { useGetMessagesQuery } from "../../../features/messages/messagesApi";
import Error from "../../ui/Error";
import ChatHead from "./ChatHead";
import Messages from "./Messages";
import Options from "./Options";

export default function ChatBody() {
    const { id } = useParams();
    const {
        data,
        isLoading,
        isError,
        error,
    } = useGetMessagesQuery(id);

    // console.log(data?.totalCount)

    // decide what to render
    let content = null;

    if (isLoading) {
        content = <div>Loading...</div>;
    } else if (!isLoading && isError) {
        content = (
            <div>
                <Error message={error?.data} />
            </div>
        );
    } else if (!isLoading && !isError && data?.data?.length === 0) {
        content = <div>No messages found!</div>;
    } else if (!isLoading && !isError && data?.data?.length > 0) {
        content = (
            <>
                <ChatHead message={data?.data[0]} />
                <Messages messages={data?.data} totalCount={+data?.totalCount} isLoading={isLoading} />
                <Options info={data?.data[0]} />
            </>
        );
    }

    return (
        <div className="w-full lg:col-span-2 lg:block">
            <div className="w-full grid conversation-row-grid">{content}</div>
        </div>
    );
}
