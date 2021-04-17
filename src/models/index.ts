import { getRepository, getCustomRepository } from 'typeorm';
import { Announcement } from './entities/announcement';
import { AnnouncementRead } from './entities/announcement-read';
import { Instance } from './entities/instance';
import { Poll } from './entities/poll';
import { PollVote } from './entities/poll-vote';
import { Meta } from './entities/meta';
import { SwSubscription } from './entities/sw-subscription';
import { NoteWatching } from './entities/note-watching';
import { NoteUnread } from './entities/note-unread';
import { RegistrationTicket } from './entities/registration-tickets';
import { UserRepository } from './repositories/user';
import { NoteRepository } from './repositories/note';
import { DriveFileRepository } from './repositories/drive-file';
import { DriveFolderRepository } from './repositories/drive-folder';
import { Log } from './entities/log';
import { AccessToken } from './entities/access-token';
import { UserNotePining } from './entities/user-note-pining';
import { SigninRepository } from './repositories/signin';
import { MessagingMessageRepository } from './repositories/messaging-message';
import { ReversiGameRepository } from './repositories/games/reversi/game';
import { UserListRepository } from './repositories/user-list';
import { UserListJoining } from './entities/user-list-joining';
import { UserGroupRepository } from './repositories/user-group';
import { UserGroupJoining } from './entities/user-group-joining';
import { UserGroupInvitationRepository } from './repositories/user-group-invitation';
import { FollowRequestRepository } from './repositories/follow-request';
import { MutingRepository } from './repositories/muting';
import { BlockingRepository } from './repositories/blocking';
import { NoteReactionRepository } from './repositories/note-reaction';
import { NotificationRepository } from './repositories/notification';
import { NoteFavoriteRepository } from './repositories/note-favorite';
import { ReversiMatchingRepository } from './repositories/games/reversi/matching';
import { UserPublickey } from './entities/user-publickey';
import { UserKeypair } from './entities/user-keypair';
import { AppRepository } from './repositories/app';
import { FollowingRepository } from './repositories/following';
import { AbuseUserReportRepository } from './repositories/abuse-user-report';
import { AuthSessionRepository } from './repositories/auth-session';
import { UserProfile } from './entities/user-profile';
import { AttestationChallenge } from './entities/attestation-challenge';
import { UserSecurityKey } from './entities/user-security-key';
import { HashtagRepository } from './repositories/hashtag';
import { PageRepository } from './repositories/page';
import { PageLikeRepository } from './repositories/page-like';
import { ModerationLogRepository } from './repositories/moderation-logs';
import { UsedUsername } from './entities/used-username';
import { ClipRepository } from './repositories/clip';
import { ClipNote } from './entities/clip-note';
import { AntennaRepository } from './repositories/antenna';
import { AntennaNote } from './entities/antenna-note';
import { PromoNote } from './entities/promo-note';
import { PromoRead } from './entities/promo-read';
import { EmojiRepository } from './repositories/emoji';
import { RelayRepository } from './repositories/relay';
import { ChannelRepository } from './repositories/channel';
import { MutedNote } from './entities/muted-note';
import { ChannelFollowing } from './entities/channel-following';
import { ChannelNotePining } from './entities/channel-note-pining';
import { RegistryItem } from './entities/registry-item';
import { UserWalletAddress } from './entities/user-wallet-address';
import { UserWalletBalance } from './entities/user-wallet-balance';
import { UserWalletJob } from './entities/user-wallet-job';
import { UserWalletTx } from './entities/user-wallet-tx';
import { UserWalletStatus } from './entities/user-wallet-status';

export const Announcements = getRepository(Announcement);
export const AnnouncementReads = getRepository(AnnouncementRead);
export const Apps = getCustomRepository(AppRepository);
export const Notes = getCustomRepository(NoteRepository);
export const NoteFavorites = getCustomRepository(NoteFavoriteRepository);
export const NoteWatchings = getRepository(NoteWatching);
export const NoteReactions = getCustomRepository(NoteReactionRepository);
export const NoteUnreads = getRepository(NoteUnread);
export const Polls = getRepository(Poll);
export const PollVotes = getRepository(PollVote);
export const Users = getCustomRepository(UserRepository);
export const UserProfiles = getRepository(UserProfile);
export const UserKeypairs = getRepository(UserKeypair);
export const AttestationChallenges = getRepository(AttestationChallenge);
export const UserSecurityKeys = getRepository(UserSecurityKey);
export const UserPublickeys = getRepository(UserPublickey);
export const UserLists = getCustomRepository(UserListRepository);
export const UserListJoinings = getRepository(UserListJoining);
export const UserGroups = getCustomRepository(UserGroupRepository);
export const UserGroupJoinings = getRepository(UserGroupJoining);
export const UserGroupInvitations = getCustomRepository(UserGroupInvitationRepository);
export const UserNotePinings = getRepository(UserNotePining);
export const UsedUsernames = getRepository(UsedUsername);
export const Followings = getCustomRepository(FollowingRepository);
export const FollowRequests = getCustomRepository(FollowRequestRepository);
export const Instances = getRepository(Instance);
export const Emojis = getCustomRepository(EmojiRepository);
export const DriveFiles = getCustomRepository(DriveFileRepository);
export const DriveFolders = getCustomRepository(DriveFolderRepository);
export const Notifications = getCustomRepository(NotificationRepository);
export const Metas = getRepository(Meta);
export const Mutings = getCustomRepository(MutingRepository);
export const Blockings = getCustomRepository(BlockingRepository);
export const SwSubscriptions = getRepository(SwSubscription);
export const Hashtags = getCustomRepository(HashtagRepository);
export const AbuseUserReports = getCustomRepository(AbuseUserReportRepository);
export const RegistrationTickets = getRepository(RegistrationTicket);
export const AuthSessions = getCustomRepository(AuthSessionRepository);
export const AccessTokens = getRepository(AccessToken);
export const Signins = getCustomRepository(SigninRepository);
export const MessagingMessages = getCustomRepository(MessagingMessageRepository);
export const ReversiGames = getCustomRepository(ReversiGameRepository);
export const ReversiMatchings = getCustomRepository(ReversiMatchingRepository);
export const Logs = getRepository(Log);
export const Pages = getCustomRepository(PageRepository);
export const PageLikes = getCustomRepository(PageLikeRepository);
export const ModerationLogs = getCustomRepository(ModerationLogRepository);
export const Clips = getCustomRepository(ClipRepository);
export const ClipNotes = getRepository(ClipNote);
export const Antennas = getCustomRepository(AntennaRepository);
export const AntennaNotes = getRepository(AntennaNote);
export const PromoNotes = getRepository(PromoNote);
export const PromoReads = getRepository(PromoRead);
export const Relays = getCustomRepository(RelayRepository);
export const MutedNotes = getRepository(MutedNote);
export const Channels = getCustomRepository(ChannelRepository);
export const ChannelFollowings = getRepository(ChannelFollowing);
export const ChannelNotePinings = getRepository(ChannelNotePining);
export const RegistryItems = getRepository(RegistryItem);
export const UserWalletAddresses = getRepository(UserWalletAddress);
export const UserWalletBalances = getRepository(UserWalletBalance);
export const UserWalletJobs = getRepository(UserWalletJob);
export const UserWalletTxs = getRepository(UserWalletTx);
export const UserWalletStatuses = getRepository(UserWalletStatus);
