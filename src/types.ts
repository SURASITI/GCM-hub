/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProjectComment {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  time: string;
}

export interface Project {
  id: string;
  title: string;
  team: string;
  category: string;
  thumbnail: string;
  votes: number;
  comments: number;
  rank?: 'gold' | 'silver' | 'bronze';
  description: string;
  projectUrl?: string;
  commentsList?: ProjectComment[];
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  createdAt: any;
  updatedAt: any;
  votedUserIds?: string[];
  favoriteCount?: number;
  favoritedUserIds?: string[];
}

export interface Activity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  action: string;
  target: string;
  time: string;
}

export interface Stat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    user: { name: 'Sarah J.', avatar: 'https://i.pravatar.cc/150?u=sarah' },
    action: 'voted for',
    target: 'AI Support Bot',
    time: '2m ago'
  },
  {
    id: '2',
    user: { name: 'Alex M.', avatar: 'https://i.pravatar.cc/150?u=alex' },
    action: 'commented on',
    target: 'Remote VR',
    time: '15m ago'
  },
  {
    id: '3',
    user: { name: 'Elena R.', avatar: 'https://i.pravatar.cc/150?u=elena' },
    action: 'uploaded',
    target: 'Energy Optimizer',
    time: '1h ago'
  },
  {
    id: '4',
    user: { name: 'David K.', avatar: 'https://i.pravatar.cc/150?u=david' },
    action: 'voted for',
    target: 'Eco-Friendly Packing',
    time: '3h ago'
  }
];

export const MOCK_STATS: Stat[] = [
  { label: 'Total Projects', value: '248', change: '+12%', isPositive: true },
  { label: 'Platform Votes', value: '14.2k', change: '+24%', isPositive: true },
  { label: 'Idea Conversion', value: '18%', change: '-2%', isPositive: false },
  { label: 'Active Teams', value: '42', change: '+4', isPositive: true }
];

export const CATEGORIES = ['All', 'MN', 'PD', 'HR&GA', 'IT', 'SE', 'UT', 'QM&QA', 'EN', 'LG%BG', 'SM', 'PR'];
