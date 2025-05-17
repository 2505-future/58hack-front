import { useAtomValue } from "jotai";
import { githubGraphQLAtom } from "~/atoms/githubUser";
import StatusCard from "~/components/StatusCard";
import calcStatus from "~/utils/calcStatus";

const Status = () => {
	const userStatus = useAtomValue(githubGraphQLAtom);
	const status = calcStatus(userStatus);

	return (
		<div className="m-10">
			<StatusCard status={status} />
		</div>
	);
};

export default Status;
