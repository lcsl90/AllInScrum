import { Redirect, Route, Switch } from 'wouter';
import { HomePage } from './home/HomePage.tsx';
import { formatJoinCodeInput } from './home/join-code-input.ts';
import { SessionPage } from './session/SessionPage.tsx';

export function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/s/:joinCode">
        {(params) => {
          // Codes aus Links werden wie getippte Codes behandelt: "k7qx2m" → "K7Q-X2M".
          const joinCode = formatJoinCodeInput(decodeURIComponent(params.joinCode));
          return <SessionPage key={joinCode} joinCode={joinCode} />;
        }}
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
