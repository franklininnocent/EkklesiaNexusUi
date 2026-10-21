import { ActionAuthorizationService } from '@core/authorization/action-authorization.service';
import { canCreateMassIntention } from './mass-intentions-auth.util';

describe('mass-intentions-auth.util', () => {
  it('uses the action catalog for create so tenant admins and read-only support follow the API gate', () => {
    const actions = {
      allows: jest.fn((id: string) => id === 'mass.intentions.create'),
    } as unknown as ActionAuthorizationService;

    expect(canCreateMassIntention(actions)).toBe(true);
    expect(actions.allows).toHaveBeenCalledWith('mass.intentions.create');
  });
});
